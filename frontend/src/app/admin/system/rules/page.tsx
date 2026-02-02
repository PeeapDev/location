'use client';

import { useState } from 'react';

// These are the system rules for identifier generation
// They are typically read-only and configured at setup time
const identifierRules = [
  {
    id: 'country_code',
    name: 'Country Prefix',
    description: 'Two-letter country code prefix for all PDA-IDs',
    value: 'SL',
    editable: false,
    category: 'PDA-ID',
  },
  {
    id: 'region_range',
    name: 'Region Code Range',
    description: 'Valid range for region codes',
    value: '1-9',
    editable: false,
    category: 'Region',
  },
  {
    id: 'district_range',
    name: 'District Code Range',
    description: 'Valid range for district codes within a region',
    value: '0-9',
    editable: false,
    category: 'District',
  },
  {
    id: 'zone_range',
    name: 'Zone Number Range',
    description: 'Valid range for zone numbers within a district',
    value: '00-99',
    editable: false,
    category: 'Zone',
  },
  {
    id: 'segment_range',
    name: 'Segment Range',
    description: 'Valid range for segment numbers within a zone',
    value: '001-999',
    editable: false,
    category: 'Segment',
  },
  {
    id: 'address_sequence',
    name: 'Address Sequence',
    description: 'Number of digits for address sequence number',
    value: '6 digits (000001-999999)',
    editable: false,
    category: 'PDA-ID',
  },
  {
    id: 'check_digit',
    name: 'Check Digit Algorithm',
    description: 'Algorithm used for check digit calculation',
    value: 'Luhn',
    editable: false,
    category: 'PDA-ID',
  },
];

const segmentTypes = [
  { range: '001-499', type: 'Residential', color: 'bg-green-100 text-green-800' },
  { range: '500-699', type: 'Commercial', color: 'bg-blue-100 text-blue-800' },
  { range: '700-849', type: 'Industrial', color: 'bg-orange-100 text-orange-800' },
  { range: '850-899', type: 'Government', color: 'bg-purple-100 text-purple-800' },
  { range: '900-949', type: 'Reserved', color: 'bg-gray-100 text-gray-800' },
  { range: '950-999', type: 'Special', color: 'bg-red-100 text-red-800' },
];

export default function IdentifierRulesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(identifierRules.map((r) => r.category)));
  const filteredRules = selectedCategory
    ? identifierRules.filter((r) => r.category === selectedCategory)
    : identifierRules;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Identifier Rules</h1>
        <p className="text-gray-600 mt-1">
          System rules for generating PDA-IDs, postal codes, and zone identifiers.
        </p>
      </div>

      {/* PDA-ID Format Explanation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">PDA-ID Format</h2>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-center text-lg mb-4">
          <span className="text-blue-600">SL</span>-
          <span className="text-green-600">XXXX</span>-
          <span className="text-orange-600">YYY</span>-
          <span className="text-purple-600">NNNNNN</span>-
          <span className="text-red-600">C</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded font-mono mb-1">SL</span>
            <p className="text-gray-600">Country Code</p>
          </div>
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded font-mono mb-1">XXXX</span>
            <p className="text-gray-600">Primary Zone (Region + District + Zone)</p>
          </div>
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded font-mono mb-1">YYY</span>
            <p className="text-gray-600">Segment</p>
          </div>
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded font-mono mb-1">NNNNNN</span>
            <p className="text-gray-600">Sequence Number</p>
          </div>
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded font-mono mb-1">C</span>
            <p className="text-gray-600">Check Digit</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>Example:</strong> <span className="font-mono">SL-2310-047-000142-7</span> represents an address in
          Region 2, District 3, Zone 10, Residential Segment 047, Sequence 142, with Check Digit 7.
        </div>
      </div>

      {/* Segment Types */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Segment Type Ranges</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {segmentTypes.map((segment) => (
            <div key={segment.type} className="text-center p-3 rounded-lg border border-gray-200">
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${segment.color} mb-2`}>
                {segment.range}
              </span>
              <p className="text-gray-900 font-medium text-sm">{segment.type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Identifier Rules</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                !selectedCategory ? 'bg-xeeno-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  selectedCategory === cat ? 'bg-xeeno-primary text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                    <p className="text-xs text-gray-500">{rule.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm">{rule.value}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <LockIcon className="w-3 h-3 mr-1" />
                      Locked
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium">About Identifier Rules</p>
            <p className="mt-1">
              These rules are system-defined and cannot be modified after initial setup.
              They ensure consistency across all generated identifiers. Contact system
              administrator for any changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
