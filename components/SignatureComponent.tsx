'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface SignatureComponentProps {
  signatureName: string
  onSignatureChange: (name: string, isCertified: boolean) => void
  isCertified: boolean
  isReadOnly?: boolean
}

export default function SignatureComponent({
  signatureName,
  onSignatureChange,
  isCertified,
  isReadOnly = false,
}: SignatureComponentProps) {
  const [tempName, setTempName] = useState(signatureName)
  const [tempCertified, setTempCertified] = useState(isCertified)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTempName(value)
    onSignatureChange(value, tempCertified)
  }

  const handleCertifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked
    setTempCertified(isChecked)
    onSignatureChange(tempName, isChecked)
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Digital Signature
        </h3>

        {/* Signature Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type Your Full Name to Digitally Sign
          </label>
          <input
            type="text"
            value={tempName}
            onChange={handleNameChange}
            disabled={isReadOnly}
            placeholder="Enter your full name"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Signature Preview */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signature Preview
          </label>
          <div className="relative rounded-lg border-2 border-dashed border-sky-300 bg-sky-50 p-6 min-h-24 flex items-center justify-center">
            {tempName ? (
              <div
                className="text-4xl font-[cursive] text-sky-600"
                style={{
                  fontFamily: 'var(--font-caveat), cursive',
                  letterSpacing: '0.5px',
                }}
              >
                {tempName}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm">
                Your signature will appear here
              </div>
            )}
          </div>
        </div>

        {/* Certification Checkbox */}
        <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
          <input
            type="checkbox"
            id="certify-signature"
            checked={tempCertified}
            onChange={handleCertifyChange}
            disabled={isReadOnly}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
          />
          <label
            htmlFor="certify-signature"
            className="text-sm text-gray-700 cursor-pointer flex-1"
          >
            I certify that this typed signature serves as the official digital
            authorization for this CMaT document.
          </label>
        </div>

        {/* Certification Status */}
        {tempCertified && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <span>Document certified for submission</span>
          </div>
        )}
      </div>
    </div>
  )
}
