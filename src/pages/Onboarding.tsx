import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, ShieldCheck, Globe, Info, ChevronRight, MapPin } from 'lucide-react';
import { useUserScope, AccessLevel } from '../context/UserScopeContext';
import { cn } from '../lib/utils';
import AccessBadge from '../components/AccessBadge';
import RegionAutocomplete from '../components/RegionAutocomplete';

export default function Onboarding() {
  const navigate = useNavigate();
  const { scope, updateScope } = useUserScope();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLevel, setSelectedLevel] = useState<AccessLevel | null>(scope.accessLevel);
  const [primaryRegion, setPrimaryRegion] = useState<string>(scope.primaryRegion || '');
  const [secondaryRegion, setSecondaryRegion] = useState<string>('');
  const [secondaryRegionsList, setSecondaryRegionsList] = useState<string[]>(scope.secondaryRegions || []);

  const handleNext = () => {
    if (step === 1 && selectedLevel) {
      setStep(2);
    } else if (step === 2) {
      updateScope({
        accessLevel: selectedLevel,
        primaryRegion: primaryRegion || null,
        secondaryRegions: secondaryRegionsList,
      });
      navigate('/map');
    }
  };

  const handleSkip = () => {
    updateScope({
      accessLevel: selectedLevel,
      primaryRegion: null,
      secondaryRegions: [],
    });
    navigate('/map');
  };

  const addSecondaryRegion = () => {
    if (secondaryRegion && !secondaryRegionsList.includes(secondaryRegion)) {
      setSecondaryRegionsList([...secondaryRegionsList, secondaryRegion]);
      setSecondaryRegion('');
    }
  };

  const removeSecondaryRegion = (region: string) => {
    setSecondaryRegionsList(secondaryRegionsList.filter(r => r !== region));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4 text-slate-900">
            {step === 1 ? 'Select Your Research Scope' : 'Localize Your Legality Results'}
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">
            {step === 1 
              ? 'The Atlas contains data ranging from common vitamins to experimental research chemicals. Your research scope determines what you see.'
              : 'Pinpoint your location to quickly assess legality and seizure risk in your specific area.'}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Level 1 */}
              <button
                onClick={() => setSelectedLevel('Citizen')}
                className={cn(
                  "text-left p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-sm",
                  selectedLevel === 'Citizen' 
                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <ShieldCheck className="w-8 h-8 mb-4 text-emerald-500" />
                <h3 className="text-lg font-bold mb-2 text-slate-900">Level 1: The Citizen</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">Safe and accessible. Focuses on vitamins, minerals, and OTC supplements available at major retailers.</p>
                <div className="flex gap-1 mb-4">
                  <AccessBadge tag="Standard" forceShow />
                </div>
                <div className="text-xs font-medium text-slate-500 mt-auto">Unlocks: Standard</div>
              </button>

              {/* Level 2 */}
              <button
                onClick={() => setSelectedLevel('Patient')}
                className={cn(
                  "text-left p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-sm",
                  selectedLevel === 'Patient' 
                    ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" 
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Shield className="w-8 h-8 mb-4 text-blue-500" />
                <h3 className="text-lg font-bold mb-2 text-slate-900">Level 2: The Patient</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">Focuses on clinical performance. Adds pharmaceutical-grade options and regulated therapeutics requiring medical oversight.</p>
                <div className="flex gap-1 mb-4">
                  <AccessBadge tag="Standard" forceShow />
                  <AccessBadge tag="Pharma" forceShow />
                </div>
                <div className="text-xs font-medium text-slate-500 mt-auto">Unlocks: Standard, Pharma</div>
              </button>

              {/* Level 3 */}
              <button
                onClick={() => setSelectedLevel('Explorer')}
                className={cn(
                  "text-left p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-sm",
                  selectedLevel === 'Explorer' 
                    ? "bg-purple-50 border-purple-500 ring-1 ring-purple-500" 
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <ShieldAlert className="w-8 h-8 mb-4 text-purple-500" />
                <h3 className="text-lg font-bold mb-2 text-slate-900">Level 3: The Explorer</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">Unrestricted access. Unlocks research chemicals, novel peptides, and experimental compounds.</p>
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 mb-4 leading-relaxed font-medium">
                  WARNING: Includes substances not FDA approved for human consumption that may be illegal or legally grey in your area. User discretion required.
                </div>
                <div className="flex gap-1 mb-4">
                  <AccessBadge tag="Standard" forceShow />
                  <AccessBadge tag="Pharma" forceShow />
                  <AccessBadge tag="Frontier" forceShow />
                  <AccessBadge tag="Unregulated" forceShow />
                  <AccessBadge tag="Restricted" forceShow />
                  <AccessBadge tag="Illicit" forceShow />
                </div>
                <div className="text-xs font-medium text-slate-500 mt-auto">Unlocks: All Data</div>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                SUBSTANCE CLASSIFICATION (REFERENCE: NEW YORK, NY)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 font-medium text-slate-500 w-16">Badge</th>
                      <th className="pb-3 font-medium text-slate-500 w-32">Category</th>
                      <th className="pb-3 font-medium text-slate-500">Description</th>
                      <th className="pb-3 font-medium text-slate-500 w-48">Examples</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Standard" forceShow /> [S]</span></td>
                      <td className="py-3 font-medium text-slate-900">Baseline</td>
                      <td className="py-3 text-slate-600">Substances commonly available over-the-counter at standard consumer doses through pharmacies or retail stores.</td>
                      <td className="py-3 text-slate-500">Vitamin D3, Creatine, Melatonin, Caffeine</td>
                    </tr>
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 font-medium text-slate-900">Clinical</td>
                      <td className="py-3 text-slate-600">Prescription-only or medically regulated substances requiring licensed physician oversight.</td>
                      <td className="py-3 text-slate-500">Testosterone, Modafinil, Adderall, Ozempic</td>
                    </tr>
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Frontier" forceShow /> [F]</span></td>
                      <td className="py-3 font-medium text-slate-900">Frontier</td>
                      <td className="py-3 text-slate-600">Clinically explored substances but not approved or recognized locally.</td>
                      <td className="py-3 text-slate-500">Cerebrolysin, Semax, Piracetam</td>
                    </tr>
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U]</span></td>
                      <td className="py-3 font-medium text-slate-900">Unregulated</td>
                      <td className="py-3 text-slate-600">Lab-grade research compounds and experimental substances lacking regulatory approval or oversight for human use.</td>
                      <td className="py-3 text-slate-500">BPC-157, MK-677, TB-500, Tesofensine</td>
                    </tr>
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Restricted" forceShow /> [!]</span></td>
                      <td className="py-3 font-medium text-slate-900">Restricted</td>
                      <td className="py-3 text-slate-600">Legal in some jurisdictions but prohibited by WADA or major anti-doping rules.</td>
                      <td className="py-3 text-slate-500">Ostarine (SARM), Cardarine, Clenbuterol</td>
                    </tr>
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Illicit" forceShow /> [X]</span></td>
                      <td className="py-3 font-medium text-slate-900">Illicit</td>
                      <td className="py-3 text-slate-600">Substances with no lawful civilian acquisition pathway.</td>
                      <td className="py-3 text-slate-500">Rhino Horn, Dimethylmercury, Carfentanil</td>
                    </tr>
                    <tr>
                      <td className="py-3"><span className="inline-flex items-center gap-1.5"><AccessBadge tag={undefined} forceShow /> [?]</span></td>
                      <td className="py-3 font-medium text-slate-900">Unknown</td>
                      <td className="py-3 text-slate-600">Displayed when reliable regional regulatory status cannot be determined.</td>
                      <td className="py-3 text-slate-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                disabled={!selectedLevel}
                className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors shadow-sm"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-900 mb-2">Primary Region</label>
                <RegionAutocomplete
                  placeholder="e.g., New York, NY, United States"
                  value={primaryRegion}
                  onChange={setPrimaryRegion}
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-900 mb-2">Secondary Regions</label>
                <div className="flex gap-2 mb-3">
                  <RegionAutocomplete
                    placeholder="e.g., Tokyo, Japan"
                    value={secondaryRegion}
                    onChange={setSecondaryRegion}
                    onEnter={addSecondaryRegion}
                    hideIcon={true}
                    className="flex-1"
                  />
                  <button
                    onClick={addSecondaryRegion}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors border border-slate-200"
                  >
                    Add
                  </button>
                </div>
                {secondaryRegionsList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {secondaryRegionsList.map(region => (
                      <span key={region} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 border border-slate-200">
                        {region}
                        <button onClick={() => removeSecondaryRegion(region)} className="text-slate-400 hover:text-slate-600">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
                <Shield className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 block mb-1">Privacy Notice</strong>
                  Laws vary significantly by state and city; we suggest pinpointing your specific city for accuracy. Data is stored locally on your device; we do not store your location on our servers.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-slate-400" />
                REGIONAL STATUS COMPARISON
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 font-medium text-slate-500 whitespace-nowrap">Substance</th>
                      <th className="pb-3 font-medium text-slate-500 whitespace-nowrap">New York, NY</th>
                      <th className="pb-3 font-medium text-slate-500 whitespace-nowrap">Tokyo, JP</th>
                      <th className="pb-3 font-medium text-slate-500 whitespace-nowrap">Tijuana, MX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Melatonin</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Standard" forceShow /> [S]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Standard" forceShow /> [S]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Testosterone</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Cerebrolysin</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Frontier" forceShow /> [F]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Frontier" forceShow /> [F]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Frontier" forceShow /> [F]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">BPC-157</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Illicit" forceShow /> [X]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Ostarine (SARM)</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U] + <AccessBadge tag="Restricted" forceShow /> [!]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Illicit" forceShow /> [X]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U] + <AccessBadge tag="Restricted" forceShow /> [!]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Phenibut</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag={undefined} forceShow /> [?]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Unregulated" forceShow /> [U]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Adderall</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Illicit" forceShow /> [X]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Illicit" forceShow /> [X]</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap">Modafinil</td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                      <td className="py-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><AccessBadge tag="Pharma" forceShow /> [P]</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-slate-500 hover:text-slate-900 font-medium transition-colors"
              >
                Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {primaryRegion ? 'Complete Setup' : 'Skip & Complete'} <ChevronRight size={18} />
                </button>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                <AccessBadge tag={undefined} forceShow /> [?] Unknown: If no region is provided, all substances will be marked with this.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
