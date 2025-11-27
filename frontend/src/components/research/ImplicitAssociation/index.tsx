'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { CustomSelect, Option } from '@/components/ui/CustomSelect';
import { FileUploadQuestion } from '../CognitiveTask/components/questions/FileUploadQuestion';

interface Target {
  id: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  files: any[];
  hitZones: any[];
}

interface Attribute {
  id: string;
  order: number;
  name: string;
}

interface ImplicitAssociationFormProps {
  researchId: string;
}

export const ImplicitAssociationForm: React.FC<ImplicitAssociationFormProps> = ({
  researchId
}) => {
  const [isRequired, setIsRequired] = useState(false);
  const [targets, setTargets] = useState<Target[]>([
    {
      id: 'target-1',
      title: '',
      description: 'You can use an image or a name for this.',
      type: 'file-upload',
      required: false,
      showConditionally: false,
      deviceFrame: false,
      files: [],
      hitZones: []
    }
  ]);

  const [attributes, setAttributes] = useState<Attribute[]>([
    { id: uuidv4(), order: 1, name: '' },
    { id: uuidv4(), order: 2, name: '' }
  ]);

  const [exerciseInstructions, setExerciseInstructions] = useState('');
  const [testInstructions, setTestInstructions] = useState('');

  const [testConfiguration, setTestConfiguration] = useState('');
  const [showResults, setShowResults] = useState(false);

  const testConfigOptions: Option[] = [
    { value: '', label: 'Please select' },
    { value: 'standard', label: 'Standard IAT' },
    { value: 'brief', label: 'Brief IAT' },
    { value: 'single-category', label: 'Single Category IAT' },
    { value: 'custom', label: 'Custom Configuration' }
  ];

  const handleTargetChange = (targetId: string, updates: Partial<Target>) => {
    setTargets(prev => {
      const updatedTargets = prev.map(target =>
        target.id === targetId ? { ...target, ...updates } : target
      );

      // Verificar si necesitamos agregar un nuevo target
      const currentTarget = updatedTargets.find(t => t.id === targetId);
      const isCurrentTargetComplete = currentTarget &&
        (currentTarget.title.trim() !== '' || currentTarget.files.length > 0);

      const shouldAddNewTarget =
        isCurrentTargetComplete &&
        updatedTargets.length < 5 &&
        targetId === `target-${updatedTargets.length}`;

      if (shouldAddNewTarget) {
        const newTarget: Target = {
          id: `target-${updatedTargets.length + 1}`,
          title: '',
          description: 'You can use an image or a name for this.',
          type: 'file-upload',
          required: false,
          showConditionally: false,
          deviceFrame: false,
          files: [],
          hitZones: []
        };
        return [...updatedTargets, newTarget];
      }

      return updatedTargets;
    });
  };

  const handleFileUpload = (targetId: string, files: FileList) => {
    console.log('File upload for target:', targetId, files);
    // TODO: Implementar lógica de upload real

    // Simular que el archivo se agregó al target para disparar la verificación
    const fileArray = Array.from(files).map(file => ({
      id: uuidv4(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: '',
      s3Key: ''
    }));

    handleTargetChange(targetId, { files: fileArray });
  };

  const handleFileDelete = (targetId: string, fileId: string) => {
    console.log('Delete file:', fileId, 'from target:', targetId);
    // TODO: Implementar lógica de eliminación
  };

  const handleAttributeChange = (attributeId: string, name: string) => {
    setAttributes(prev => prev.map(attr =>
      attr.id === attributeId ? { ...attr, name } : attr
    ));
  };

  const handleAddAttribute = () => {
    const newAttribute: Attribute = {
      id: uuidv4(),
      order: attributes.length + 1,
      name: ''
    };
    setAttributes(prev => [...prev, newAttribute]);
  };

  const handleRemoveAttribute = (attributeId: string) => {
    if (attributes.length > 2) {
      setAttributes(prev =>
        prev.filter(attr => attr.id !== attributeId)
           .map((attr, index) => ({ ...attr, order: index + 1 }))
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Switch de Required */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Implicit Association Test</h3>
            <p className="text-sm text-gray-600">
              Habilitar o deshabilitar el test de asociación implícita para esta investigación
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {isRequired ? 'Requerido' : 'Opcional'}
            </span>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
              aria-label="Marcar como requerido el test de asociación implícita"
            />
          </div>
        </div>
      </div>

      {/* Contenido de configuración siempre visible */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-sm text-gray-600 mb-8">
          Our Implicit Association Test is fully automated technology. You just need to do is add objects or attributes to be tested.
        </p>

        {/* Target Objects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {targets.map((target, index) => (
            <div key={target.id}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Target {index + 1}
              </h3>
              <FileUploadQuestion
                question={target}
                onQuestionChange={(updates) => handleTargetChange(target.id, updates)}
                onFileUpload={(files) => handleFileUpload(target.id, files)}
                onFileDelete={(fileId) => handleFileDelete(target.id, fileId)}
                validationErrors={null}
                disabled={false}
                isUploading={false}
                uploadProgress={0}
              />
            </div>
          ))}
        </div>

        {/* Criteria/Attributes Section */}
        <div className="border-t pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Criteria</h3>
              <p className="text-sm text-gray-600">
                You can add attributes that describe your criteria in the best way. Please see the example:
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Priming display time: <span className="font-medium">300ms</span>
            </div>
          </div>

          {/* Attributes Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attribute name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attributes.map((attribute) => (
                  <tr key={attribute.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {String(attribute.order).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={attribute.name}
                        onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                        placeholder="Attribute"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Image
                        </span>
                        <button
                          onClick={() => handleRemoveAttribute(attribute.id)}
                          disabled={attributes.length <= 2}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={attributes.length <= 2 ? "Minimum 2 attributes required" : "Delete attribute"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Attribute Button */}
          <div className="mt-4">
            <Button
              onClick={handleAddAttribute}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Attribute
            </Button>
          </div>
        </div>

        {/* Instructions Section */}
        <div className="border-t pt-8 space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Instructions</h3>

          {/* Exercise Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exercise instructions
            </label>
            <Textarea
              value={exerciseInstructions}
              onChange={(e) => setExerciseInstructions(e.target.value)}
              rows={8}
              className="w-full"
              placeholder="Enter exercise instructions..."
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {exerciseInstructions.length} / 1000
            </p>
          </div>

          {/* Test Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test instructions
            </label>
            <Textarea
              value={testInstructions}
              onChange={(e) => setTestInstructions(e.target.value)}
              rows={8}
              className="w-full"
              placeholder="Enter test instructions..."
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {testInstructions.length} / 1000
            </p>
          </div>
        </div>

        {/* Test Configuration Section */}
        <div className="border-t pt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test configuration
            </label>
            <CustomSelect
              value={testConfiguration}
              onChange={setTestConfiguration}
              options={testConfigOptions}
              placeholder="Please select"
              className="w-full"
            />
          </div>

          {/* Show Results Checkbox */}
          <div className="flex items-start space-x-3">
            <input
              id="show-results"
              type="checkbox"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
              className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="show-results" className="text-sm text-gray-700">
              Show results to respondents
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};