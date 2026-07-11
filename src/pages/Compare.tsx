import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { ArrowLeft, CheckCircle, XCircle, Minus } from 'lucide-react';

export default function Compare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { substances: SUPPLEMENTS, brands: BRANDS, stacks: STACKS } = useCatalog();
  const type = searchParams.get('type');
  const id1 = searchParams.get('id1');
  const id2 = searchParams.get('id2');

  const [item1, setItem1] = useState<any>(null);
  const [item2, setItem2] = useState<any>(null);

  useEffect(() => {
    if (type === 'substance') {
      setItem1(SUPPLEMENTS.find(s => s.id === id1));
      setItem2(SUPPLEMENTS.find(s => s.id === id2));
    } else if (type === 'stack') {
      setItem1(STACKS.find(s => s.id === id1));
      setItem2(STACKS.find(s => s.id === id2));
    } else if (type === 'brand') {
      setItem1(BRANDS.find(b => b.id === id1));
      setItem2(BRANDS.find(b => b.id === id2));
    }
  }, [type, id1, id2, SUPPLEMENTS, STACKS, BRANDS]);

  if (!type || !id1 || !id2) {
    return <div className="p-8 text-center text-slate-500">Invalid comparison parameters.</div>;
  }

  if (!item1 || !item2) {
    return <div className="p-8 text-center text-slate-500">Loading comparison...</div>;
  }

  const renderComparisonRow = (label: string, val1: any, val2: any, isBoolean = false) => {
    return (
      <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="font-medium text-slate-500 dark:text-zinc-400 text-sm flex items-center">{label}</div>
        <div className="text-slate-900 dark:text-zinc-100">
          {isBoolean ? (
            val1 ? <CheckCircle className="text-emerald-500" size={20} /> : <XCircle className="text-red-500" size={20} />
          ) : (
            val1 || <Minus className="text-slate-300 dark:text-zinc-700" size={20} />
          )}
        </div>
        <div className="text-slate-900 dark:text-zinc-100">
          {isBoolean ? (
            val2 ? <CheckCircle className="text-emerald-500" size={20} /> : <XCircle className="text-red-500" size={20} />
          ) : (
            val2 || <Minus className="text-slate-300 dark:text-zinc-700" size={20} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-8 capitalize">
        Compare {type}s
      </h1>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 items-end">
          <div className="font-medium text-slate-500 dark:text-zinc-400">Features</div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{item1.name}</h2>
            {type === 'substance' && <p className="text-sm text-slate-500 dark:text-zinc-400">{item1.typeTags?.[0]}</p>}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{item2.name}</h2>
            {type === 'substance' && <p className="text-sm text-slate-500 dark:text-zinc-400">{item2.typeTags?.[0]}</p>}
          </div>
        </div>

        {/* Comparison Rows */}
        <div className="px-6">
          {type === 'substance' && (
            <>
              {renderComparisonRow('Description', item1.description, item2.description)}
              {renderComparisonRow('Average Dosage', item1.averageDosage, item2.averageDosage)}
              {renderComparisonRow('Length of Cycle', item1.lengthOfCycle, item2.lengthOfCycle)}
              {renderComparisonRow('Risk Level', item1.riskLevel, item2.riskLevel)}
              {renderComparisonRow('Classification', item1.classification, item2.classification)}
              {renderComparisonRow('Tolerance Buildup', item1.toleranceBuildup, item2.toleranceBuildup)}
            </>
          )}

          {type === 'brand' && (
            <>
              {renderComparisonRow('Description', item1.description, item2.description)}
              {renderComparisonRow('User Rating', item1.userRating ? `${item1.userRating}/5` : null, item2.userRating ? `${item2.userRating}/5` : null)}
              {renderComparisonRow('Shipping Reliability', item1.shippingReliability ? `${item1.shippingReliability}/5` : null, item2.shippingReliability ? `${item2.shippingReliability}/5` : null)}
              {renderComparisonRow('Contamination Reports', item1.contaminationReports, item2.contaminationReports)}
              {renderComparisonRow('Third-Party Tested', item1.thirdPartyTestingLinks?.length > 0, item2.thirdPartyTestingLinks?.length > 0, true)}
            </>
          )}

          {type === 'stack' && (
            <>
              {renderComparisonRow('Description', item1.description, item2.description)}
              {renderComparisonRow('Substances', item1.substances?.map((s: any) => s.name).join(', '), item2.substances?.map((s: any) => s.name).join(', '))}
              {renderComparisonRow('Creator ID', item1.creatorId, item2.creatorId)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
