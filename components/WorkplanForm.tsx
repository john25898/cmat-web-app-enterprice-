'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import SignatureComponent from './SignatureComponent'

interface FacilityRow {
  id: string
  date: string
  facility: string
  activity: string
  objectives: string
  budget: number
}

interface WorkplanFormProps {
  onSave: (data: Record<string, unknown>) => void
  onSubmit: (data: Record<string, unknown>) => void
  editingData?: Record<string, unknown>
}

export default function WorkplanForm({
  onSave,
  onSubmit,
  editingData,
}: WorkplanFormProps) {
  const [region, setRegion] = useState(editingData?.region || '')
  const [officerName, setOfficerName] = useState(editingData?.officerName || '')
  const [designation, setDesignation] = useState(editingData?.designation || '')
  const [date, setDate] = useState(editingData?.date || '')
  const [facilities, setFacilities] = useState<FacilityRow[]>(
    (editingData?.facilities as FacilityRow[]) || []
  )
  const [signatureName, setSignatureName] = useState(
    (editingData?.signatureName as string) || ''
  )
  const [isCertified, setIsCertified] = useState(
    (editingData?.isCertified as boolean) || false
  )

  const totalBudget = facilities.reduce((sum, f) => sum + (f.budget || 0), 0)
  const canAddMore = facilities.length < 4

  const addFacilityRow = () => {
    if (canAddMore) {
      setFacilities([
        ...facilities,
        {
          id: `${Date.now()}`,
          date: '',
          facility: '',
          activity: '',
          objectives: '',
          budget: 0,
        },
      ])
    }
  }

  const removeFacilityRow = (id: string) => {
    setFacilities(facilities.filter((f) => f.id !== id))
  }

  const updateFacilityRow = (id: string, field: string, value: unknown) => {
    setFacilities(
      facilities.map((f) =>
        f.id === id ? { ...f, [field]: value } : f
      )
    )
  }

  const handleSave = () => {
    const data = {
      region,
      officerName,
      designation,
      date,
      facilities,
    }
    onSave(data)
  }

  const handleSubmit = () => {
    if (!region || !officerName || !designation || !date || facilities.length === 0) {
      alert('Please fill in all required fields')
      return
    }
    const data = {
      region,
      officerName,
      designation,
      date,
      facilities,
    }
    onSubmit(data)
  }

  return (
    <div className="space-y-6">
      {/* Header Fields */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Region
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g., Central"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Officer Name
          </label>
          <input
            type="text"
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
            placeholder="Full name"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Designation
          </label>
          <input
            type="text"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g., CMaT Officer"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Facilities & Activities */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Facilities & Activities
          </label>
          <span className="text-xs text-gray-500">
            {facilities.length}/4 entries
          </span>
        </div>

        <div className="space-y-4">
          {facilities.map((row, idx) => (
            <div
              key={row.id}
              className="rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Facility {idx + 1}
                </h4>
                <button
                  onClick={() => removeFacilityRow(row.id)}
                  className="inline-flex rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Remove this facility"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Row 1: Date & Facility Name */}
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) =>
                      updateFacilityRow(row.id, 'date', e.target.value)
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Facility Visited
                  </label>
                  <input
                    type="text"
                    value={row.facility}
                    onChange={(e) =>
                      updateFacilityRow(row.id, 'facility', e.target.value)
                    }
                    placeholder="Facility name"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Row 2: Activity */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Planned Activity
                </label>
                <textarea
                  value={row.activity}
                  onChange={(e) =>
                    updateFacilityRow(row.id, 'activity', e.target.value)
                  }
                  placeholder="Describe the planned activity"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Row 3: Objectives */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Thematic Area / Objectives
                </label>
                <textarea
                  value={row.objectives}
                  onChange={(e) =>
                    updateFacilityRow(row.id, 'objectives', e.target.value)
                  }
                  placeholder="Specify thematic area and objectives"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Row 4: Budget */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Budget Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">USD</span>
                  <input
                    type="number"
                    value={row.budget}
                    onChange={(e) =>
                      updateFacilityRow(
                        row.id,
                        'budget',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={addFacilityRow}
            disabled={!canAddMore}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              canAddMore
                ? 'Add facility row'
                : 'Maximum 4 facilities allowed'
            }
          >
            <Plus className="h-4 w-4" />
            Add Facility Row
          </button>
          {!canAddMore && (
            <span className="text-xs text-gray-500">
              Maximum 4 facilities reached
            </span>
          )}
        </div>
      </div>

      {/* Total Amount */}
      <div className="flex items-center justify-end rounded-lg bg-sky-50 px-4 py-3">
        <div>
          <p className="text-sm text-sky-700">Total Amount</p>
          <p className="text-2xl font-bold text-sky-900">
            {totalBudget.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </p>
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

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            const data = {
              region,
              officerName,
              designation,
              date,
              facilities,
              signatureName,
              isCertified,
            }
            onSave(data)
          }}
          className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Save Draft
        </button>
        <button
          onClick={() => {
            if (
              !region ||
              !officerName ||
              !designation ||
              !date ||
              facilities.length === 0 ||
              !signatureName ||
              !isCertified
            ) {
              alert(
                'Please fill in all fields and certify your digital signature before submitting.'
              )
              return
            }
            const data = {
              region,
              officerName,
              designation,
              date,
              facilities,
              signatureName,
              isCertified,
            }
            onSubmit(data)
          }}
          className="rounded-lg bg-sky-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-sky-700"
        >
          Submit to Supervisor
        </button>
      </div>
    </div>
  )
}
