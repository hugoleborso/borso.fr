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

const CLIENT_FILE = 'site/src/lib/api.client.ts';
const CLIENT_EXPORT = 'api';
const READ_METHOD = '$get';
const CLIENT_MEMBER_PREFIX = '$';
const FINGERPRINT_LENGTH = 12;
const CYCLE_MARK = '<cycle>';
const SCALAR_FLAGS =
  TypeFlags.StringLike |
  TypeFlags.NumberLike |
  TypeFlags.BigIntLike |
  TypeFlags.BooleanLike |
  TypeFlags.Null |
  TypeFlags.Undefined |
  TypeFlags.Unknown |
  TypeFlags.Any |
  TypeFlags.Never;

export function assertPresent<Value>(value: Value | undefined, what: string): Value {
  if (value === undefined) throw new Error(`response shape: no ${what}`);
  return value;
}

function isReference(type: Type): type is TypeReference {
  return type.isTypeReference();
}

function getReference(type: Type): TypeReference {
  return assertPresent([type].find(isReference), 'type reference');
}

function getFirstTypeArgument(checker: Checker, type: Type): Type {
  const argument = checker.getTypeArguments(getReference(type))[0];
  return assertPresent(argument, 'type argument');
}

function getTypeOf(checker: Checker, symbol: CompilerSymbol): Type {
  return assertPresent(checker.getTypeOfSymbol(symbol), `type of ${symbol.name}`);
}

function getCallResult(checker: Checker, type: Type): Type[] {
  return checker
    .getSignaturesOfType(type, SignatureKind.Call)
    .map((signature) => assertPresent(checker.getReturnTypeOfSignature(signature), 'return type'));
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
    return assertPresent(type.getTypes(), 'union members')
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
      const answers = response.isUnionType()
        ? assertPresent(response.getTypes(), 'answers')
        : [response];
      return answers.map((answer) => {
        const json = assertPresent(checker.getPropertyOfType(answer, 'json'), 'json reader');
        const [body] = getCallResult(checker, getTypeOf(checker, json));
        const payload = getFirstTypeArgument(checker, assertPresent(body, 'json body'));
        return `${path} ${buildShape(checker, payload, new Map())}`;
      });
    });
  });
}

// @FollowsBlueprint adapter-external-service
export function readResponseShapeFingerprint(appDirectory: string): string {
  const compiler = new API({ cwd: appDirectory });
  try {
    const snapshot = compiler.updateSnapshot({
      openProjects: [join(appDirectory, 'tsconfig.json')],
    });
    const project = assertPresent(snapshot.getProjects()[0], 'project');
    const { checker } = project;
    const client = assertPresent(
      project.program.getSourceFile(join(appDirectory, CLIENT_FILE)),
      CLIENT_FILE,
    );
    const clientModule = assertPresent(checker.getSymbolAtLocation(client), 'client module');
    const clientExport = assertPresent(
      checker.getExportsOfModule(clientModule).find((symbol) => symbol.name === CLIENT_EXPORT),
      `${CLIENT_EXPORT} export`,
    );
    const shapes = listReadShapes(checker, getTypeOf(checker, clientExport), '').sort();
    return createHash('sha256')
      .update(shapes.join('\n'))
      .digest('hex')
      .slice(0, FINGERPRINT_LENGTH);
  } finally {
    compiler.close();
  }
}
