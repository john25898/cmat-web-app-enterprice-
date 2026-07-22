'use client'

import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'

interface ReviewDialogProps {
  employeeName: string
  submissionData?: Record<string, unknown>
  onSubmit: (feedback: string) => void
  onClose: () => void
}

export default function ReviewDialog({
  employeeName,
  submissionData,
  onSubmit,
  onClose,
}: ReviewDialogProps) {
  const [feedback, setFeedback] = useState('')
  const signatureName = submissionData?.signatureName as string
  const isCertified = submissionData?.isCertified as boolean

  const handleSubmit = () => {
    if (!feedback.trim()) {
      alert('Please provide feedback before returning')
      return
    }
    onSubmit(feedback)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Return for Revision</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Digital Signature Section */}
          {signatureName && (
            <div className="mb-4 rounded-lg bg-gray-50 p-3 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">
                Digital Signature
              </h3>
              <div className="rounded border-2 border-sky-200 bg-white p-3 mb-2 min-h-16 flex items-center justify-center">
                <div
                  className="text-2xl text-sky-600"
                  style={{
                    fontFamily: 'var(--font-caveat), cursive',
                    letterSpacing: '0.5px',
                  }}
                >
                  {signatureName}
                </div>
              </div>
              {isCertified && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Digitally certified</span>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Provide guidance notes for <span className="font-medium">{employeeName}</span> to revise their submission.
          </p>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Enter your feedback and guidance notes here..."
            rows={4}
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            Return to Employee
          </button>
        </div>
      </div>
    </div>
  )
}
