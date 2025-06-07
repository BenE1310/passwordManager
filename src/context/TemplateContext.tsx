import React, { createContext, useContext, useState, useEffect } from 'react';

interface TemplateField {
  name: string;
  type: string;
  required: boolean;
  label: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
}

interface TemplateContextType {
  templates: Template[];
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, template: Template) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => Template | undefined;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<Template[]>([]);

  // Load templates from JSON file on initial mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/data/password_templates.json');
        const data = await response.json();
        setTemplates(data.templates);
      } catch (error) {
        console.error('Error loading templates:', error);
        // If loading fails, set some default templates
        setTemplates([]);
      }
    };

    loadTemplates();
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('passwordTemplates', JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }, [templates]);

  const addTemplate = (template: Template) => {
    setTemplates(prev => [...prev, template]);
  };

  const updateTemplate = (id: string, updatedTemplate: Template) => {
    setTemplates(prev => prev.map(template => 
      template.id === id ? updatedTemplate : template
    ));
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
  };

  const getTemplate = (id: string) => {
    return templates.find(template => template.id === id);
  };

  return (
    <TemplateContext.Provider value={{ templates, addTemplate, updateTemplate, deleteTemplate, getTemplate }}>
      {children}
    </TemplateContext.Provider>
  );
};

export const useTemplates = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
}; 