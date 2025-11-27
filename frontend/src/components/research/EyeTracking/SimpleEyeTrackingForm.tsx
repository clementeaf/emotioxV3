'use client';

import React, { useState, useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface EyeTrackingFormProps {
  researchId: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export const SimpleEyeTrackingForm: React.FC<EyeTrackingFormProps> = ({
  researchId
}) => {
  const [isRequired, setIsRequired] = useState(false);
  const [instructionText, setInstructionText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Task configuration checkboxes
  const [isShelfTask, setIsShelfTask] = useState(false);
  const [resizeImage, setResizeImage] = useState(false);
  const [eyeTrackingDevice, setEyeTrackingDevice] = useState(false);
  const [eyeTrackingWebcam, setEyeTrackingWebcam] = useState(false);
  const [clickMeasurement, setClickMeasurement] = useState(false);
  const [finishByKeyOrClick, setFinishByKeyOrClick] = useState(false);
  const [holdVertical, setHoldVertical] = useState(false);
  const [holdHorizontal, setHoldHorizontal] = useState(false);

  // Priming display time
  const [primingTime, setPrimingTime] = useState('');

  // Shelf configuration
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [numberOfShelfs, setNumberOfShelfs] = useState(0);
  const [itemsPerShelf, setItemsPerShelf] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);

    // Simulate file processing
    Array.from(files).forEach((file) => {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      };

      setTimeout(() => {
        setUploadedFiles(prev => [...prev, newFile]);
        setIsUploading(false);
      }, 1000);
    });
  };

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const primingOptions = ['5 secs', '10 secs', '15 secs'];

  return (
    <div className="space-y-8">
      {/* Header Toggle */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Eye Tracking</h3>
            <p className="text-sm text-gray-600">
              Eye Tracking is a biometric method to map humans interactions and map the movement of eyes.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              A response will be qualified as "skipped by logic" if the respondent can't answer/proceed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {isRequired ? 'Required' : 'Optional'}
            </span>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
              aria-label="Mark Eye Tracking as required"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Instruction Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instruction for the task <span className="italic text-gray-500">*italic, **bold** - bullet list 1. ordered</span>
          </label>
          <Textarea
            value={instructionText}
            onChange={(e) => setInstructionText(e.target.value)}
            placeholder="Where would you click to..."
            rows={3}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column - Eye Tracking Stimuli */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Eye Tracking Stimuli</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please, upload the image or video to be tested with eye tracking. The duration
            </p>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Click or drag file to this area to upload
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Support for a single or bulk upload.<br />
                  JPG, JPEG, PNG or GIF supported<br />
                  Max image dimensions are 1600x1600.<br />
                  Max file size is 5MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Select file'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDelete(file.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Resolution recommended: 1000x1000px
            </p>
          </div>

          {/* Right Column - Task Configuration and Shelf Settings */}
          <div className="space-y-8">
            {/* Task Configuration */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Task configuration</h3>
                <span className="text-sm text-gray-500">Please select</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isShelfTask}
                    onChange={(e) => setIsShelfTask(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">This is a Shelf Task</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={resizeImage}
                    onChange={(e) => setResizeImage(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Resize image to fit screen</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eyeTrackingDevice}
                    onChange={(e) => setEyeTrackingDevice(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Eye tracking Device (Soon)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eyeTrackingWebcam}
                    onChange={(e) => setEyeTrackingWebcam(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Eye tracking (Webcam based)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={clickMeasurement}
                    onChange={(e) => setClickMeasurement(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Click measurement</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={finishByKeyOrClick}
                    onChange={(e) => setFinishByKeyOrClick(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Finish by pressing any key or mouse click</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={holdVertical}
                    onChange={(e) => setHoldVertical(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Hold device in vertical position while testing</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={holdHorizontal}
                    onChange={(e) => setHoldHorizontal(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Hold device in horizontal position while testing</span>
                </label>
              </div>

              {/* Priming Display Time */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Priming display time:</span>
                </div>
                <div className="flex gap-2">
                  {primingOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPrimingTime(option)}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        primingTime === option
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* For Shelf only */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">For Shelf only:</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={randomizeOptions}
                  onChange={(e) => setRandomizeOptions(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Randomize options (images)</span>
              </label>
            </div>

            {/* Shelf configuration */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Shelf configuration</h4>

              {/* Shelf preview image */}
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 flex items-center justify-center max-w-xs">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-300 rounded mx-auto mb-2 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Shelf preview</p>
                </div>
              </div>

              {/* Shelf controls */}
              <div className="flex gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Shelfs
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={numberOfShelfs}
                      onChange={(e) => setNumberOfShelfs(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{numberOfShelfs}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Items per Shelf
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={itemsPerShelf}
                      onChange={(e) => setItemsPerShelf(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">{itemsPerShelf}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};