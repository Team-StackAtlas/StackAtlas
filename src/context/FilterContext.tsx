import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TypeTag, Classification, AdministrationMethod } from '../data/mockData';

interface FilterContextType {
  activeTypes: TypeTag[];
  setActiveTypes: React.Dispatch<React.SetStateAction<TypeTag[]>>;
  prioritizedTypes: TypeTag[];
  setPrioritizedTypes: React.Dispatch<React.SetStateAction<TypeTag[]>>;
  activeAdmins: AdministrationMethod[];
  setActiveAdmins: React.Dispatch<React.SetStateAction<AdministrationMethod[]>>;
  activeClassifications: Classification[];
  setActiveClassifications: React.Dispatch<React.SetStateAction<Classification[]>>;
  toggleType: (type: TypeTag) => void;
  togglePriority: (e: React.MouseEvent, type: TypeTag) => void;
  toggleAdmin: (admin: AdministrationMethod) => void;
  toggleClassification: (classification: Classification) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  // Positive-filter model: an EMPTY set means "no filter, show everything".
  // Selecting a chip narrows results TO that value (and the chip reads as
  // active), which matches what people expect when they click "Supplement".
  const [activeTypes, setActiveTypes] = useState<TypeTag[]>([]);
  const [prioritizedTypes, setPrioritizedTypes] = useState<TypeTag[]>([]);
  const [activeAdmins, setActiveAdmins] = useState<AdministrationMethod[]>([]);
  const [activeClassifications, setActiveClassifications] = useState<Classification[]>([]);

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

  const toggleClassification = (classification: Classification) => {
    setActiveClassifications(prev =>
      prev.includes(classification) ? prev.filter(c => c !== classification) : [...prev, classification]
    );
  };

  return (
    <FilterContext.Provider value={{
      activeTypes, setActiveTypes,
      prioritizedTypes, setPrioritizedTypes,
      activeAdmins, setActiveAdmins,
      activeClassifications, setActiveClassifications,
      toggleType, togglePriority, toggleAdmin, toggleClassification
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
