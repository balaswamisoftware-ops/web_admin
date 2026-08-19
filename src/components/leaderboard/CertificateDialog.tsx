import { Printer, X } from 'lucide-react'
import { useModalA11y } from '../../hooks/useModalA11y'
import { Button } from '../ui'
import { formatDate, formatNumber } from '../../lib/format'

export interface CertificateSubject {
  fullName: string
  nakshatram?: string
  gothram?: string
  count: number
  completedAt: string
}

interface CertificateDialogProps {
  subject: CertificateSubject | null
  onClose: () => void
}

/**
 * A printable completion certificate for a devotee who finished their personal
 * chant goal. Printing hides the rest of the app rather than opening a popup
 * window, so it works with a blocker on; "Save as PDF" in the print dialog is
 * how an admin gets a file to send.
 */
export function CertificateDialog({ subject, onClose }: CertificateDialogProps) {
  const ref = useModalA11y(subject !== null, onClose)
  if (!subject) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      {/* Only the certificate survives a print. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #certificate-print, #certificate-print * { visibility: visible !important; }
          #certificate-print {
            position: fixed; inset: 0; margin: 0;
            width: 100%; height: auto;
            box-shadow: none !important; border-radius: 0 !important;
          }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Completion certificate"
        className="w-full max-w-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-semibold text-white">Completion certificate</h2>
          <div className="flex gap-2">
            <Button size="sm" leftIcon={Printer} onPress={() => window.print()}>
              Print / Save as PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          id="certificate-print"
          className="relative overflow-hidden rounded-2xl bg-[#fffdf7] p-10 text-center shadow-2xl sm:p-14"
        >
          {/* Saffron double border */}
          <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-[#d97706]" />
          <div className="pointer-events-none absolute inset-5 rounded-lg border border-[#d97706]/40" />

          <div className="relative">
            <p className="font-serif text-sm uppercase tracking-[0.35em] text-[#92400e]">
              Sri Vidya Peetham
            </p>
            <p className="mt-1 text-xs tracking-[0.2em] text-[#a16207]">
              శ్రీ విద్యా పీఠం
            </p>

            <h1 className="mt-6 font-serif text-3xl font-bold tracking-tight text-[#7c2d12] sm:text-4xl">
              Certificate of Completion
            </h1>
            <div className="mx-auto mt-3 h-px w-24 bg-[#d97706]" />

            <p className="mt-7 text-sm text-[#78350f]">This is to certify that</p>
            <p className="mt-2 font-serif text-2xl font-bold text-[#7c2d12] sm:text-3xl">
              {subject.fullName}
            </p>
            {(subject.nakshatram || subject.gothram) && (
              <p className="mt-1 text-sm text-[#92400e]">
                {[subject.nakshatram, subject.gothram].filter(Boolean).join(' · ')}
              </p>
            )}

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#78350f]">
              has, with devotion and perseverance, completed{' '}
              <strong className="font-semibold">
                {formatNumber(subject.count)}
              </strong>{' '}
              recitations of the sacred mantra
            </p>
            <p className="mt-3 font-serif text-xl font-semibold tracking-wide text-[#b45309]">
              ॐ नमः शिवाय
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-[#a16207]">
              Om Namah Shivaya
            </p>

            <p className="mt-6 text-sm text-[#78350f]">
              contributing to the 11 Crore community chant mission.
            </p>

            <div className="mt-10 flex items-end justify-between gap-6 text-left">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#a16207]">
                  Completed on
                </p>
                <p className="font-medium text-[#7c2d12]">
                  {formatDate(subject.completedAt)}
                </p>
              </div>
              <div className="text-right">
                <div className="mb-1 h-px w-40 bg-[#d97706]/60" />
                <p className="text-xs uppercase tracking-wider text-[#a16207]">
                  For Sri Vidya Peetham
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
