import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type Certificate, type Publication } from '../laboratory/certificate';
import { renderCertificate } from '../laboratory/certificate-renderer';
import {
  type Snapshot,
  type Sample,
  type Signature,
} from '../laboratory/contracts';
import { InvalidSignatureTag, personName, signatureStamp } from './shared';

/** A publication as the Certificate list shows it. */
export function publicationLine(data: Snapshot, p: Publication) {
  const how = p.channelDetail ? `${p.channel} (${p.channelDetail})` : p.channel;
  return `Published ${signatureStamp(p.publishedAt)} by ${personName(data, p.publishedBy) ?? p.publishedBy}, ${how}, to ${p.recipients.join('; ')}`;
}

/** The Sample's Certificate of Analysis versions, each opened as a printable
 * document. */
export function CertificateVersions({
  sample: s,
  data,
}: {
  sample: Sample;
  data: Snapshot;
}) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => setOpen(null), [s.id]);
  const versions = data.certificates.filter((c) => c.sampleId === s.id);
  if (!versions.length) return null;
  const opened = versions.find((c) => c.version === open);
  return (
    <section
      className="signatures certificates"
      aria-label="Certificate of Analysis"
    >
      <h3>Certificate of Analysis</h3>
      <ul>
        {versions.map((c) => (
          <li key={c.version}>
            <span className="sig-meaning">Version {c.version}</span>
            <span>
              Approved{' '}
              <time dateTime={c.approvedAt}>
                {signatureStamp(c.approvedAt)}
              </time>
              {/* Every version after the first is issued by an Amendment. */}
              {c.version > 1 && <span className="cert-tag">Amended</span>}
              {c.supersededBy !== null && (
                <span className="cert-tag superseded">
                  Superseded by version {c.supersededBy}
                </span>
              )}
            </span>
            <button className="btn sm" onClick={() => setOpen(c.version)}>
              Open printable view
            </button>
            <span className={'publication' + (c.publication ? '' : ' pending')}>
              {c.publication
                ? publicationLine(data, c.publication)
                : 'Not yet Published.'}
            </span>
          </li>
        ))}
      </ul>
      {open !== null && (
        <CertificateView
          sampleId={s.id}
          signatures={data.signatures.filter((x) => x.sampleId === s.id)}
          version={open}
          supersededBy={opened?.supersededBy ?? null}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

/**
 * A Certificate version as a printable page. The content is fetched from the
 * Certificate route and laid out from the renderer's document; print styles
 * hide the workspace so the browser's print-to-PDF produces the PDF.
 */
export function CertificateView({
  sampleId,
  signatures,
  version,
  supersededBy,
  onClose,
}: {
  sampleId: string;
  /** The Sample's recorded Electronic signatures, as last checked. */
  signatures: Signature[];
  version: number;
  /** Shown in the toolbar only: the locked document is printed as issued. */
  supersededBy: number | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState<
    { certificate: Certificate } | { error: string } | null
  >(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  useEffect(() => {
    let live = true;
    setLoaded(null);
    fetch(
      `/api/samples/${encodeURIComponent(sampleId)}/certificates/${version}`,
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? 'The Certificate could not be loaded.');
        return body.certificate as Certificate;
      })
      .then(
        (certificate) => live && setLoaded({ certificate }),
        (error: Error) => live && setLoaded({ error: error.message }),
      );
    return () => {
      live = false;
    };
  }, [sampleId, version]);
  const certificate =
    loaded && 'certificate' in loaded ? loaded.certificate : null;
  const doc = certificate && renderCertificate(certificate.content);
  // Each signature the Certificate prints, in its order, and whether its
  // record fails its check.
  const invalid = (certificate?.content.signatures ?? []).map((printed) =>
    signatures.some(
      (x) =>
        !x.valid &&
        x.meaning === printed.meaning &&
        x.signerId === printed.signerId &&
        x.signedAt === printed.signedAt,
    ),
  );
  return createPortal(
    <dialog
      ref={ref}
      className="certificate-view"
      aria-label={`Certificate of Analysis, Sample ${sampleId}, version ${version}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="certificate-toolbar">
        <span>
          Certificate of Analysis · <span className="num">{sampleId}</span> ·
          Version {version}
          {/* Also shown when the altered fields are the ones a printed
              signature is matched on. */}
          {signatures.some((x) => !x.valid) && <InvalidSignatureTag />}
          {supersededBy !== null && (
            <span className="cert-tag superseded">
              Superseded by version {supersededBy}
            </span>
          )}
        </span>
        <div className="sign-actions">
          <button
            className="btn primary"
            disabled={!doc}
            onClick={() => window.print()}
          >
            Print or save as PDF
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {!loaded ? (
        <p className="blank">Loading the Certificate…</p>
      ) : 'error' in loaded ? (
        <p role="alert" className="flash inline error">
          {loaded.error}
        </p>
      ) : (
        doc && (
          <article className="certificate-document">
            <header className="certificate-head">
              <div>
                <p className="certificate-lab">{doc.laboratory.name}</p>
                {doc.laboratory.lines.map((line) => (
                  <p key={line} className="certificate-lab-line">
                    {line}
                  </p>
                ))}
              </div>
              <div className="certificate-title">
                <h1>{doc.title}</h1>
                <p>{doc.reference}</p>
                {doc.marker && (
                  <p className="certificate-marker">{doc.marker}</p>
                )}
              </div>
            </header>
            {doc.sections.map((section) => (
              <section key={section.heading} className="certificate-section">
                <h2>{section.heading}</h2>
                {section.kind === 'fields' ? (
                  <dl className="certificate-fields">
                    {section.fields.map((f) => (
                      <div key={f.label}>
                        <dt>{f.label}</dt>
                        <dd>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : section.kind === 'table' ? (
                  <>
                    <table className="certificate-table">
                      <thead>
                        <tr>
                          {section.columns.map((c) => (
                            <th key={c} scope="col">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>
                                {typeof cell === 'string' ? (
                                  cell
                                ) : (
                                  // role="list" keeps list semantics in
                                  // WebKit, which drops them without bullets.
                                  <ul className="certificate-lines" role="list">
                                    {cell.map((line) => (
                                      <li key={line}>{line}</li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {section.notes.length > 0 && (
                      <ul className="certificate-notes">
                        {section.notes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : section.kind === 'text' ? (
                  section.paragraphs.map((p, i) => (
                    <p key={i} className="certificate-text">
                      {p}
                    </p>
                  ))
                ) : (
                  <table className="certificate-table">
                    <thead>
                      <tr>
                        <th scope="col">Meaning</th>
                        <th scope="col">Printed name</th>
                        <th scope="col">Date and time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.signatures.map((x, i) => (
                        <tr key={x.meaning + x.signedAt}>
                          <td>{x.meaning}</td>
                          <td>
                            {x.name}
                            {invalid[i] && <InvalidSignatureTag />}
                          </td>
                          <td>{x.signedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
            <footer className="certificate-foot">
              <p>{doc.footer}</p>
              <p className="certificate-hash">SHA-256 {certificate!.sha256}</p>
            </footer>
          </article>
        )
      )}
    </dialog>,
    document.body,
  );
}
