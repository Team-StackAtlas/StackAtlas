import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TypeTag, StatusClassification, AdministrationMethod, TYPE_TAGS } from '../data/mockData';

const ADMIN_METHODS: AdministrationMethod[] = ['👄 Oral', '💉 Injectable', '🧴 Topical', '👅 Sublingual'];
const STATUSES: StatusClassification[] = ['🟢 Baseline', '🔵 Clinical', '🟣 Frontier', '🟡 Unregulated', '🟠 Restricted', '🔴 Illicit'];

interface FilterContextType {
  activeTypes: TypeTag[];
  setActiveTypes: React.Dispatch<React.SetStateAction<TypeTag[]>>;
  prioritizedTypes: TypeTag[];
  setPrioritizedTypes: React.Dispatch<React.SetStateAction<TypeTag[]>>;
  activeAdmins: AdministrationMethod[];
  setActiveAdmins: React.Dispatch<React.SetStateAction<AdministrationMethod[]>>;
  activeStatuses: StatusClassification[];
  setActiveStatuses: React.Dispatch<React.SetStateAction<StatusClassification[]>>;
  toggleType: (type: TypeTag) => void;
  togglePriority: (e: React.MouseEvent, type: TypeTag) => void;
  toggleAdmin: (admin: AdministrationMethod) => void;
  toggleStatus: (status: StatusClassification) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeTypes, setActiveTypes] = useState<TypeTag[]>(TYPE_TAGS.map(t => t.full));
  const [prioritizedTypes, setPrioritizedTypes] = useState<TypeTag[]>([]);
  const [activeAdmins, setActiveAdmins] = useState<AdministrationMethod[]>(ADMIN_METHODS);
  const [activeStatuses, setActiveStatuses] = useState<StatusClassification[]>(STATUSES);

  const toggleType = (type: TypeTag) => {
    setActiveTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const togglePriority = (e: React.MouseEvent, type: TypeTag) => {
    e.preventDefault();
    setPrioritizedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAdmin = (admin: AdministrationMethod) => {
    setActiveAdmins(prev => 
      prev.includes(admin) ? prev.filter(a => a !== admin) : [...prev, admin]
    );
  };

  const toggleStatus = (status: StatusClassification) => {
    setActiveStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  return (
    <FilterContext.Provider value={{
      activeTypes, setActiveTypes,
      prioritizedTypes, setPrioritizedTypes,
      activeAdmins, setActiveAdmins,
      activeStatuses, setActiveStatuses,
      toggleType, togglePriority, toggleAdmin, toggleStatus
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
