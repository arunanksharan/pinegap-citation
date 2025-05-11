'use client';

import React, { useRef } from 'react';
import { useFileStore, FileType, PdfParameters } from '@/store/useFileStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ControlPanel: React.FC = () => {
  const {
    setUploadedFile,
    fileType,
    setFileType,
    pdfParameters,
    updatePdfParameter,
    numPages,
  } = useFileStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Optionally, auto-detect file type or set a default
      if (!fileType) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') setFileType('pdf');
        // Add more auto-detection if needed
      }
    }
  };

  const handleFileTypeChange = (value: string) => {
    setFileType(value as FileType);
  };

  const handleParameterChange = (
    key: keyof PdfParameters,
    newValue: string // Keep value as string initially for processing
  ) => {
    let processedValue: number;
    const currentValue = pdfParameters[key];

    if (newValue.trim() === '') {
      // Bug 1: Handle empty input - set to 0 or 1 for page number
      processedValue = key === 'pageNumber' ? 1 : 0;
    } else {
      // If current value is 0 and new value starts with "0" followed by a digit (e.g., "05")
      // and the new value is different from "0"
      // treat the new digit as the intended value.
      if (
        currentValue === 0 &&
        newValue.length > 1 &&
        newValue !== '0' &&
        newValue.startsWith('0')
      ) {
        // E.g. currentValue is 0, user types '5', newValue becomes "05".
        // We want to parse "5" in this specific case.
        // Also handles cases like "005" -> 5
        let tempVal = newValue;
        while (tempVal.startsWith('0') && tempVal.length > 1) {
          tempVal = tempVal.substring(1);
        }
        processedValue = parseFloat(tempVal);
      } else {
        processedValue = parseFloat(newValue);
      }

      if (isNaN(processedValue)) {
        // If somehow still NaN after parseFloat (e.g., "abc"), default it
        processedValue = key === 'pageNumber' ? 1 : 0;
      }
    }

    if (key === 'pageNumber') {
      processedValue = Math.round(processedValue);
      if (numPages !== null && numPages > 0) {
        if (processedValue < 1) {
          processedValue = 1;
        } else if (processedValue > numPages) {
          processedValue = numPages;
        }
      } else {
        processedValue = 1;
      }
    }

    if (key !== 'pageNumber' && processedValue < 0) {
      processedValue = 0;
    }

    updatePdfParameter(key, processedValue);
  };

  return (
    <div className="p-4 border-r h-full overflow-y-auto space-y-6 bg-slate-50">
      <h2 className="text-xl font-semibold mb-4">Controls</h2>

      <div className="space-y-2">
        <Label htmlFor="fileType">File Type</Label>
        <Select
          onValueChange={handleFileTypeChange}
          value={fileType || undefined}
        >
          <SelectTrigger id="fileType">
            <SelectValue placeholder="Select file type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          Upload File
        </Button>
        <Input
          id="fileUpload"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium">Parameters</h3>
        {(Object.keys(pdfParameters) as Array<keyof PdfParameters>).map(
          (key) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Label>
              <Input
                id={key}
                type="text"
                value={pdfParameters[key].toString()}
                onChange={(e) => handleParameterChange(key, e.target.value)}
                placeholder={`Enter ${key.toLowerCase()}`}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
