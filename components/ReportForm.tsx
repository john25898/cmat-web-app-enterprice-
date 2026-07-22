'use client'

import { useState } from 'react'
import SignatureComponent from './SignatureComponent'

interface ReportFormProps {
  onSubmit: (data: Record<string, unknown>) => void
  linkedWorkplans: Array<{ id: string; data: Record<string, unknown> }>
  editingData?: Record<string, unknown>
}

export default function ReportForm({
  onSubmit,
  linkedWorkplans,
  editingData,
}: ReportFormProps) {
  const [date, setDate] = useState(editingData?.date || '')
  const [facility, setFacility] = useState(editingData?.facility || '')
  const [objectives, setObjectives] = useState(editingData?.objectives || '')
  const [findings, setFindings] = useState(editingData?.findings || '')
  const [actionPoints, setActionPoints] = useState(editingData?.actionPoints || '')
  const [responsible, setResponsible] = useState(editingData?.responsible || '')
  const [linkedWorkplan, setLinkedWorkplan] = useState(editingData?.linkedWorkplan || '')
  const [signatureName, setSignatureName] = useState(
    (editingData?.signatureName as string) || ''
  )
  const [isCertified, setIsCertified] = useState(
    (editingData?.isCertified as boolean) || false
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !date ||
      !facility ||
      !objectives ||
      !findings ||
      !actionPoints ||
      !responsible ||
      !signatureName ||
      !isCertified
    ) {
      alert('Please fill in all fields and certify your digital signature before submitting.')
      return
    }

    const data = {
      date,
      facility,
      objectives,
      findings,
      actionPoints,
      responsible,
      linkedWorkplan,
      signatureName,
      isCertified,
    }

    onSubmit(data)

    // Reset form
    setDate('')
    setFacility('')
    setObjectives('')
    setFindings('')
    setActionPoints('')
    setResponsible('')
    setLinkedWorkplan('')
    setSignatureName('')
    setIsCertified(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primary Fields Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Facility <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            placeholder="Facility name"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Objectives */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Objectives <span className="text-red-500">*</span>
        </label>
        <textarea
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder="Describe the objectives of this visit"
          rows={3}
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Key Findings */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Key Findings <span className="text-red-500">*</span>
        </label>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Document key findings from the fieldwork"
          rows={3}
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Action Points */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Action Points <span className="text-red-500">*</span>
        </label>
        <textarea
          value={actionPoints}
          onChange={(e) => setActionPoints(e.target.value)}
          placeholder="Outline action points for follow-up"
          rows={3}
          required
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>

      {/* Responsible Person */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Responsible Person <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            placeholder="Name of responsible person"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Link to Workplan (Optional)
          </label>
          <select
            value={linkedWorkplan}
            onChange={(e) => setLinkedWorkplan(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select a workplan...</option>
            {linkedWorkplans.map((wp) => (
              <option key={wp.id} value={wp.id}>
                Workplan {new Date(wp.data.date as string).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Digital Signature */}
      <SignatureComponent
        signatureName={signatureName}
        onSignatureChange={(name, certified) => {
          setSignatureName(name)
          setIsCertified(certified)
        }}
        isCertified={isCertified}
      />

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-sky-700"
        >
          Submit Report
        </button>
      </div>
    </form>
  )
}
