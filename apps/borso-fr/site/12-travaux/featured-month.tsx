import { ImageSlot, StatusTag } from './components';
import type { Challenge, Month, Proof } from './data';
import { formatScore, kindLabel, monthScore, proofIcon } from './data.utils';
import { ACCENT, DASH_RULE, INK, MUTED, NOTE_INK, PROOF_BG, RULE, STRIPE_LIGHT } from './theme';

function proofKey(challengeTitle: string, type: string, value: string): string {
  return `${challengeTitle}::${type}::${value}`;
}

function ProofMedia({ proof }: { proof: Proof }) {
  if (proof.type === 'photo') {
    return (
      <img
        src={proof.v}
        alt={proof.label ?? ''}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          background: PROOF_BG,
        }}
      />
    );
  }
  return (
    <video
      src={proof.v}
      controls
      playsInline
      preload="metadata"
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        background: PROOF_BG,
      }}
    >
      <track kind="captions" />
    </video>
  );
}

function ProofChip({ proof }: { proof: Proof }) {
  return (
    <span
      style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 11,
        color: INK,
        background: PROOF_BG,
        padding: '4px 9px',
        letterSpacing: '0.02em',
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
      }}
    >
      <span style={{ color: ACCENT, fontWeight: 600 }}>{proofIcon(proof.type)}</span>
      {proof.type === 'link' ? (proof.label ?? proof.v) : proof.v}
    </span>
  );
}

function ChallengeRow({
  challenge,
  position,
  isLast,
}: {
  challenge: Challenge;
  position: number;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        gap: 20,
        paddingBottom: 20,
        borderBottom: isLast ? 'none' : `1px dashed ${DASH_RULE}`,
      }}
    >
      <div
        style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: 32,
          color: ACCENT,
          lineHeight: 1,
          fontStyle: 'italic',
        }}
      >
        {position}.
      </div>
      <div>
        <div
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 26,
            lineHeight: 1.15,
            color: INK,
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          {challenge.t}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: challenge.note ? 10 : 0,
          }}
        >
          <StatusTag status={challenge.status} />
          <span
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 11,
              color: MUTED,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {kindLabel(challenge.kind)}
          </span>
        </div>
        {challenge.note && (
          <div
            style={{
              fontFamily: '"Instrument Serif", serif',
              fontStyle: 'italic',
              fontSize: 17,
              color: NOTE_INK,
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            « {challenge.note} »
          </div>
        )}
        {challenge.proofs && challenge.proofs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {challenge.proofs.some((proof) => proof.type === 'photo' || proof.type === 'video') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {challenge.proofs
                  .filter((proof) => proof.type === 'photo' || proof.type === 'video')
                  .map((proof) => (
                    <ProofMedia key={proofKey(challenge.t, proof.type, proof.v)} proof={proof} />
                  ))}
              </div>
            )}
            {challenge.proofs.some((proof) => proof.type !== 'photo' && proof.type !== 'video') && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {challenge.proofs
                  .filter((proof) => proof.type !== 'photo' && proof.type !== 'video')
                  .map((proof) => (
                    <ProofChip key={proofKey(challenge.t, proof.type, proof.v)} proof={proof} />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeaturedMonth({ month, year }: { month: Month; year: number }) {
  const score = monthScore(month);
  const pct = score.total ? score.done / score.total : 0;
  return (
    <article
      className="twelve-travaux-featured"
      style={{
        borderTop: `1px solid ${RULE}`,
        borderBottom: `1px solid ${RULE}`,
        padding: '32px 0 36px',
        gap: 48,
      }}
    >
      <div>
        {month.cover ? (
          <img
            src={month.cover}
            alt={`Couverture ${month.name}`}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        ) : (
          <ImageSlot label={month.name} height={420} />
        )}
      </div>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: ACCENT,
            }}
          >
            Mois en focus · {String(month.m).padStart(2, '0')}/{year}
          </div>
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 13,
              color: MUTED,
            }}
          >
            {formatScore(score.done)} sur {score.total} aboutis
          </div>
        </div>

        <h2
          className="twelve-travaux-month-name"
          style={{
            fontFamily: '"Instrument Serif", serif',
            fontWeight: 400,
            lineHeight: 0.88,
            margin: '0 0 4px',
            color: INK,
            letterSpacing: '-0.02em',
          }}
        >
          {month.name}.
        </h2>

        <div style={{ margin: '24px 0 32px' }}>
          <div
            style={{
              height: 8,
              background: STRIPE_LIGHT,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct * 100}%`,
                background: ACCENT,
                transition: 'width 1s cubic-bezier(.2,.7,.3,1)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {month.challenges.map((challenge, index) => (
            <ChallengeRow
              key={challenge.t}
              challenge={challenge}
              position={index + 1}
              isLast={index === month.challenges.length - 1}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
