import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  API,
  type Checker,
  type Symbol as CompilerSymbol,
  SignatureKind,
  SymbolFlags,
  type Type,
  TypeFlags,
  type TypeReference,
} from 'typescript/unstable/sync';

export interface ResponseShapeSource {
  readonly projectDirectory: string;
  readonly configFile: string;
  readonly clientFile: string;
  readonly clientExport: string;
}

export type CompilerOpener = () => API;

const PRAGMA_CLIENT_FILE = 'site/src/lib/api.client.ts';
const PRAGMA_CLIENT_EXPORT = 'api';
const READ_METHOD = '$get';
const CLIENT_MEMBER_PREFIX = '$';
const FINGERPRINT_LENGTH = 12;
const CYCLE_MARK = '<cycle>';
const MISSING_ANSWER = 'response shape: the compiler left a type unanswered';
const SCALAR_FLAGS =
  TypeFlags.StringLike |
  TypeFlags.NumberLike |
  TypeFlags.BigIntLike |
  TypeFlags.BooleanLike |
  TypeFlags.Null |
  TypeFlags.Undefined |
  TypeFlags.Unknown |
  TypeFlags.Never;

export function assertPresent<Value>(value: Value | undefined): Value {
  if (value === undefined) throw new Error(MISSING_ANSWER);
  return value;
}

function isReference(type: Type): type is TypeReference {
  return type.isTypeReference();
}

function getReference(type: Type): TypeReference {
  return assertPresent([type].find(isReference));
}

function getFirstTypeArgument(checker: Checker, type: Type): Type {
  const argument = checker.getTypeArguments(getReference(type))[0];
  return assertPresent(argument);
}

function getTypeOf(checker: Checker, symbol: CompilerSymbol): Type {
  return assertPresent(checker.getTypeOfSymbol(symbol));
}

function getCallResult(checker: Checker, type: Type): Type[] {
  return checker
    .getSignaturesOfType(type, SignatureKind.Call)
    .map((signature) => assertPresent(checker.getReturnTypeOfSignature(signature)));
}

function buildShape(checker: Checker, type: Type, seen: Map<number, string>): string {
  const known = seen.get(type.id);
  if (known !== undefined) return known;
  seen.set(type.id, CYCLE_MARK);
  const shape = composeShape(checker, type, seen);
  seen.set(type.id, shape);
  return shape;
}

function composeShape(checker: Checker, type: Type, seen: Map<number, string>): string {
  if (type.isUnionType()) {
    return assertPresent(type.getTypes())
      .map((member) => buildShape(checker, member, seen))
      .sort()
      .join('|');
  }
  if ((type.flags & SCALAR_FLAGS) !== 0) return checker.typeToString(type);
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const items = checker
      .getTypeArguments(getReference(type))
      .map((item) => buildShape(checker, item, seen));
    return `[${items.join(',')}]`;
  }
  const fields = checker.getPropertiesOfType(type).map((property) => {
    const optional = (property.flags & SymbolFlags.Optional) === 0 ? '' : '?';
    return `${property.name}${optional}:${buildShape(checker, getTypeOf(checker, property), seen)}`;
  });
  return `{${fields.sort().join(';')}}`;
}

function listReadShapes(checker: Checker, route: Type, path: string): string[] {
  return checker.getPropertiesOfType(route).flatMap((member) => {
    const memberType = getTypeOf(checker, member);
    if (member.name !== READ_METHOD) {
      if (member.name.startsWith(CLIENT_MEMBER_PREFIX)) return [];
      return listReadShapes(checker, memberType, `${path}/${member.name}`);
    }
    return getCallResult(checker, memberType).flatMap((pending) => {
      const response = getFirstTypeArgument(checker, pending);
      const answers = response.isUnionType() ? assertPresent(response.getTypes()) : [response];
      return answers.map((answer) => {
        const json = assertPresent(checker.getPropertyOfType(answer, 'json'));
        const [body] = getCallResult(checker, getTypeOf(checker, json));
        const payload = getFirstTypeArgument(checker, assertPresent(body));
        return `${path} ${buildShape(checker, payload, new Map())}`;
      });
    });
  });
}

function openTypeScript(): API {
  return new API();
}

// @FollowsBlueprint adapter-external-service
export function listResponseShapes(
  source: ResponseShapeSource,
  openCompiler: CompilerOpener = openTypeScript,
): string[] {
  const compiler = openCompiler();
  try {
    const snapshot = compiler.updateSnapshot({
      openProjects: [join(source.projectDirectory, source.configFile)],
    });
    const project = assertPresent(snapshot.getProjects()[0]);
    const { checker } = project;
    const client = assertPresent(
      project.program.getSourceFile(join(source.projectDirectory, source.clientFile)),
    );
    const clientModule = assertPresent(checker.getSymbolAtLocation(client));
    const clientExport = assertPresent(
      checker
        .getExportsOfModule(clientModule)
        .find((symbol) => symbol.name === source.clientExport),
    );
    return listReadShapes(checker, getTypeOf(checker, clientExport), '').sort();
  } finally {
    compiler.close();
  }
}

export function readResponseShapeFingerprint(appDirectory: string): string {
  const shapes = listResponseShapes({
    projectDirectory: appDirectory,
    configFile: 'tsconfig.json',
    clientFile: PRAGMA_CLIENT_FILE,
    clientExport: PRAGMA_CLIENT_EXPORT,
  });
  return createHash('sha256').update(shapes.join('\n')).digest('hex').slice(0, FINGERPRINT_LENGTH);
}
