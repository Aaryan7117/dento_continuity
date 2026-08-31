import { notFound } from "next/navigation";
import Link from "next/link";
import { getEncounterDetail } from "@/lib/queries";
import AddNoteForm, { SignNoteButton } from "@/app/components/AddNoteForm";
import AddToothFindingForm from "@/app/components/AddToothFindingForm";
import StatusBadge from "@/app/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function EncounterDetailPage({
  params,
}: {
  params: Promise<{ id: string; encounterId: string }>;
}) {
  const { id: patientId, encounterId } = await params;
  const encounter = await getEncounterDetail(encounterId);
  if (!encounter) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/patients/${patientId}`}
            className="text-sm text-brand hover:underline"
          >
            ← Back to chart
          </Link>
          <h1 className="text-xl font-semibold text-ink mt-1">
            Encounter —{" "}
            {new Date(encounter.occurredAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </h1>
          {encounter.provider && (
            <p className="text-sm text-ink-muted">
              Provider: {encounter.provider.name}
            </p>
          )}
          {encounter.summary && (
            <p className="text-sm text-ink-muted mt-1">{encounter.summary}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Notes */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            Clinical Notes
          </h2>

          {/* Existing notes */}
          {encounter.notes.length > 0 && (
            <div className="space-y-2">
              {encounter.notes.map((note) => (
                <div
                  key={note.id}
                  className={`bg-surface border rounded-lg p-3 ${
                    note.signed
                      ? "border-green-500/25"
                      : "border-line"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-ink-muted">
                      {new Date(note.createdAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <SignNoteButton noteId={note.id} signed={note.signed} />
                  </div>
                  <p className="text-sm text-ink whitespace-pre-wrap">
                    {note.body}
                  </p>
                  {note.signedAt && (
                    <p className="text-xs text-green-600 mt-1.5">
                      Signed {new Date(note.signedAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add note form */}
          <div className="bg-canvas border border-line rounded-lg p-3">
            <h3 className="text-sm font-medium text-ink mb-2">
              Add Note
            </h3>
            <AddNoteForm encounterId={encounterId} />
          </div>
        </div>

        {/* Right: Findings + Images */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            Tooth Findings
          </h2>

          {/* Existing findings */}
          {encounter.toothFindings.length > 0 && (
            <div className="space-y-2">
              {encounter.toothFindings.map((tf) => (
                <div
                  key={tf.id}
                  className="bg-surface border border-line rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-ink">
                      #{tf.toothCode}
                    </span>
                    <StatusBadge status={tf.finding} />
                    {tf.surfaces.length > 0 && (
                      <span className="text-xs text-ink-muted">
                        {tf.surfaces.join(", ")}
                      </span>
                    )}
                  </div>
                  {tf.note && (
                    <p className="text-xs text-ink-muted mt-1">{tf.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add finding form */}
          <div className="bg-canvas border border-line rounded-lg p-3">
            <h3 className="text-sm font-medium text-ink mb-2">
              Record Finding
            </h3>
            <AddToothFindingForm
              patientId={patientId}
              encounterId={encounterId}
            />
          </div>

          {encounter.images.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-ink mb-2">
                Images
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {encounter.images.map((img) => (
                  <div
                    key={img.id}
                    className="bg-surface border border-line rounded-lg overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.storagePath}
                      alt={img.caption ?? `${img.kind} image`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs text-ink-muted truncate">
                        {img.caption ?? img.kind}
                      </p>
                      {img.capturedAt && (
                        <p className="text-xs text-ink-faint">
                          {new Date(img.capturedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
