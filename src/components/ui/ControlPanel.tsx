'use client';

import React, { useRef } from 'react';
import { useFileStore, FileType, PdfParameters } from '@/store/useFileStore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ControlPanel: React.FC = () => {
  const {
    setUploadedFile,
    fileType,
    setFileType,
    pdfParameters,
    updatePdfParameter,
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
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updatePdfParameter(key, numValue);
    }
  };

  return (
    <div className="p-4 border-r h-full overflow-y-auto space-y-6 bg-slate-50">
      <h2 className="text-xl font-semibold mb-4">Controls</h2>

      <div className="space-y-2">
        <Label htmlFor="fileType">File Type</Label>
        <Select onValueChange={handleFileTypeChange} value={fileType || undefined}>
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
        <Button onClick={() => fileInputRef.current?.click()} className="w-full">
          Upload File
        </Button>
        <Input
          id="fileUpload"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          // Consider adding accept attributes, e.g., accept=".pdf,.html,.txt"
        />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-medium">Parameters</h3>
        {(Object.keys(pdfParameters) as Array<keyof PdfParameters>).map((key) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key} className="capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()} {/* Adds space before caps */}
            </Label>
            <Input
              id={key}
              type="number"
              value={pdfParameters[key]}
              onChange={(e) => handleParameterChange(key, e.target.value)}
              placeholder={`Enter ${key.toLowerCase()}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControlPanel;
