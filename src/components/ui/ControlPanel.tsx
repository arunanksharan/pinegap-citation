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

const fileTypeAcceptMap: Record<FileType, string> = {
  pdf: '.pdf,application/pdf',
  html: '.html,.htm,text/html',
  text: '.txt,text/plain',
};

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

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      if (fileType && fileTypeAcceptMap[fileType]) {
        fileInputRef.current.accept = fileTypeAcceptMap[fileType];
      } else {
        fileInputRef.current.accept = '*/*';
      }
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const selectedDropdownType = useFileStore.getState().fileType;

      if (selectedDropdownType) {
        const expectedAcceptString = fileTypeAcceptMap[selectedDropdownType];
        const acceptedExtensions = expectedAcceptString.split(',').filter(s => s.startsWith('.'));
        const acceptedMimeTypes = expectedAcceptString.split(',').filter(s => !s.startsWith('.'));

        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const fileMimeType = file.type;

        let typeMatches = false;
        if (acceptedExtensions.includes(fileExtension)) {
          typeMatches = true;
        }
        if (!typeMatches && acceptedMimeTypes.includes(fileMimeType)) {
          typeMatches = true;
        }

        if (!typeMatches) {
          alert(
            `Error: The selected file ("${file.name}") does not match the expected file type ("${selectedDropdownType.toUpperCase()}").\nPlease select a file matching: ${expectedAcceptString}`
          );
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }

      setUploadedFile(file);
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!selectedDropdownType) {
        if (extension === 'pdf') setFileType('pdf');
        else if (extension === 'html' || extension === 'htm') setFileType('html');
        else if (extension === 'txt') setFileType('text');
      } else {
        if ( (extension === 'pdf' && selectedDropdownType === 'pdf') ||
             ((extension === 'html' || extension === 'htm') && selectedDropdownType === 'html') ||
             (extension === 'txt' && selectedDropdownType === 'text') ) {
        }
      }

    }
  };

  const handleFileTypeChange = (value: string) => {
    setFileType(value as FileType);
  };

  const handleParameterChange = (
    key: keyof PdfParameters,
    newValue: string
  ) => {
    let processedValue: number;
    const currentValue = pdfParameters[key];

    if (newValue.trim() === '') {
      processedValue = key === 'pageNumber' ? 1 : 0;
    } else {
      if (
        currentValue === 0 &&
        newValue.length > 1 &&
        newValue !== '0' &&
        newValue.startsWith('0')
      ) {
        let tempVal = newValue;
        while (tempVal.startsWith('0') && tempVal.length > 1) {
          tempVal = tempVal.substring(1);
        }
        processedValue = parseFloat(tempVal);
      } else {
        processedValue = parseFloat(newValue);
      }

      if (isNaN(processedValue)) {
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
          onClick={handleUploadButtonClick}
          className="w-full"
        >
          Upload File
        </Button>
        <Input
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
