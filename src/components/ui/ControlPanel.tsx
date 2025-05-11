'use client';

import React, { useRef, useEffect } from 'react';
import { useFileStore, FileType, PdfParameters } from '@/store/useFileStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch'; // Corrected import path

const ControlPanel: React.FC = () => {
  const {
    fileType,
    setFileType,
    pdfParameters,
    updatePdfParameter,
    searchText,
    setSearchText,
    levenshteinThreshold,
    setLevenshteinThreshold,
    highlightColor,
    setHighlightColor,
    isCaseSensitive,
    setIsCaseSensitive,
    setUploadedFileAndSyncActive, // New action
    resetTextParameters,
    resetAllParameters,
    // Actions for debounced values
    setDebouncedSearchText,
    setDebouncedLevenshteinThreshold,
  } = useFileStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce logic for searchText and levenshteinThreshold
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setDebouncedLevenshteinThreshold(levenshteinThreshold);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchText, levenshteinThreshold, setDebouncedSearchText, setDebouncedLevenshteinThreshold]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const currentSelectedType = useFileStore.getState().fileType;

      // Basic type check based on dropdown selection and actual file type
      let isValidType = false;
      let fileContent: string | null = null;

      if (currentSelectedType === 'pdf' && file.type === 'application/pdf') {
        isValidType = true;
      } else if (currentSelectedType === 'text' && (file.type === 'text/plain' || file.name.endsWith('.txt'))) {
        isValidType = true;
        try {
          fileContent = await file.text();
        } catch (error) {
          console.error("Error reading text file:", error);
          alert("Error reading text file.");
          return;
        }
      } else if (currentSelectedType === 'html' && (file.type === 'text/html' || file.name.endsWith('.html'))) {
        isValidType = true;
        // HTML content can also be read as text for now, or handled differently later
        try {
          fileContent = await file.text(); 
        } catch (error) {
          console.error("Error reading html file:", error);
          alert("Error reading html file.");
          return;
        }
      }

      if (isValidType) {
        setUploadedFileAndSyncActive(file, fileContent);
      } else {
        alert(`Invalid file type. Expected ${currentSelectedType}, but got ${file.type || 'unknown'}.`);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset file input
        }
      }
    } else {
        // If no file is selected (e.g., user cancels dialog), clear potentially existing file for the active type
        // This might require a new action like `clearActiveFileForType` or careful use of `setUploadedFileAndSyncActive(null, null)`
        // For now, let's assume setUploadedFileAndSyncActive handles null appropriately or we add it if needed.
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleParameterChange = (
    key: keyof PdfParameters,
    value: string
  ) => {
    const numValue = parseFloat(value);
    updatePdfParameter(key, isNaN(numValue) ? 0 : numValue);
  };

  // Effect to set the accept attribute on the file input when fileType changes
  useEffect(() => {
    if (fileInputRef.current) {
      if (fileType === 'pdf') {
        fileInputRef.current.accept = '.pdf';
      } else if (fileType === 'text') {
        fileInputRef.current.accept = '.txt,text/plain';
      } else if (fileType === 'html') {
        fileInputRef.current.accept = '.html,text/html';
      } else {
        fileInputRef.current.accept = ''; // Allow all if no specific type or reset
      }
    }
  }, [fileType]);

  return (
    <div className="w-full p-4 space-y-6 overflow-y-auto bg-gray-100 h-full border-r border-gray-300">
      <div>
        <Button onClick={resetAllParameters} className="w-full mb-4" variant="outline">
            Reset All & Clear File Choice
        </Button>
        <Label htmlFor="fileType" className="text-sm font-medium">
          Select File Type
        </Label>
        <Select
          value={fileType || ''}
          onValueChange={(value) => {
            const newFileType = value as FileType | '';
            setFileType(newFileType === '' ? null : newFileType);
          }}
        >
          <SelectTrigger id="fileType">
            <SelectValue placeholder="Select file type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="text">Text (.txt)</SelectItem>
            <SelectItem value="html">HTML (.html)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditionally render Upload button and hidden file input if a fileType is selected */}
      {fileType && (
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
      )}

      {/* Conditional section for Text/HTML specific controls */}
      {(fileType === 'text' || fileType === 'html') && ( // Combined for now as they share search
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Text Matching</h3>
          <div className="space-y-1">
            <Label htmlFor="searchText">Search Text</Label>
            <Textarea
              id="searchText"
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSearchText(e.target.value)}
              placeholder="Enter text to search..."
              rows={3} // Add some default rows
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="levenshteinThreshold">Match Threshold (0 = exact)</Label>
            <Input 
              id="levenshteinThreshold"
              type="number"
              value={levenshteinThreshold.toString()} 
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setLevenshteinThreshold(isNaN(val) || val < 0 ? 0 : val);
              }}
              min="0"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="highlightColor">Highlight Color</Label>
            <Input 
              id="highlightColor" 
              type="color" 
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)} 
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
                id="caseSensitive"
                checked={isCaseSensitive}
                onCheckedChange={setIsCaseSensitive}
            />
            <Label htmlFor="caseSensitive">Case Sensitive</Label>
          </div>
          <Button onClick={resetTextParameters} variant="outline" className="w-full">Reset Text Parameters</Button>
        </div>
      )}

      {/* PDF Parameters Section - conditionally rendered for PDF */}
      {fileType === 'pdf' && (
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
                  type="text" // Keep as text for easier handling of float/int, parsing done in store setter
                  value={pdfParameters[key].toString()}
                  onChange={(e) => handleParameterChange(key, e.target.value)}
                  placeholder={`Enter ${key.toLowerCase()}`}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
