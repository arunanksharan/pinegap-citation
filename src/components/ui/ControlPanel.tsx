'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFileStore, FileType, PdfParameters } from '@/store/useFileStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ControlPanel: React.FC = () => {
  const {
    fileType,
    setFileType,
    setUploadedFileAndSyncActive,
    pdfParameters,
    updatePdfParameter,
    searchText,
    setSearchText,
    levenshteinThreshold,
    setLevenshteinThreshold,
    triggerSearch,
    isCaseSensitive,
    setIsCaseSensitive,
    highlightColor,
    setHighlightColor,
    resetTextParameters,
    resetAllParameters,
    fileInputKey,
    resetFileInput,
  } = useFileStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for the scale input to allow intermediate values like "1."
  const [scaleDisplayValue, setScaleDisplayValue] = useState<string>(
    pdfParameters.scale.toString()
  );

  // Sync scaleDisplayValue with global state if pdfParameters.scale changes externally
  useEffect(() => {
    const storeValStr = pdfParameters.scale.toString();

    // Case 1: User is typing an intermediate float string like "1."
    // If scaleDisplayValue is "X." and pdfParameters.scale is numerically X, let "X." persist.
    if (scaleDisplayValue.endsWith('.') && Number(scaleDisplayValue.slice(0, -1)) === pdfParameters.scale) {
      return;
    }

    // Case 2: User cleared the input, which defaults pdfParameters.scale to 1.
    // If scaleDisplayValue is empty and the store reflects the default (1 for scale), set display to "1".
    if (scaleDisplayValue.trim() === "" && pdfParameters.scale === 1) {
      setScaleDisplayValue("1");
      return;
    }

    // Case 3: General synchronization or correcting invalid local state.
    // If scaleDisplayValue is not identical to the string representation of the store value,
    // update scaleDisplayValue. This handles external changes to pdfParameters.scale (e.g., reset)
    // and also resets invalid local text (like "abc") to the store's current valid value.
    if (scaleDisplayValue !== storeValStr) {
      setScaleDisplayValue(storeValStr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfParameters.scale]); 

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const currentSelectedType = useFileStore.getState().fileType;

      let isValidType = false;

      if (currentSelectedType === 'pdf') {
        if (file.type === 'application/pdf') {
          isValidType = true;
          setUploadedFileAndSyncActive(file, null);
        } else {
          alert('Invalid file type. Expected PDF.');
        }
      } else if (currentSelectedType === 'text') {
        if (file.type === 'text/plain') {
          isValidType = true;
          const fileReader = new FileReader();
          fileReader.readAsText(file);
          fileReader.onload = () => {
            if (isValidType) {
              setUploadedFileAndSyncActive(file, fileReader.result as string);
            }
          };
          fileReader.onerror = () => {
            alert('Error reading file.');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          };
        } else {
          alert('Invalid file type. Expected TXT.');
        }
      } else if (currentSelectedType === 'html') {
        if (file.type === 'text/html') {
          isValidType = true;
          const fileReader = new FileReader();
          fileReader.readAsText(file);
          fileReader.onload = () => {
            if (isValidType) {
              setUploadedFileAndSyncActive(file, fileReader.result as string);
            }
          };
          fileReader.onerror = () => {
            alert('Error reading file.');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          };
        } else {
          alert('Invalid file type. Expected HTML.');
        }
      }
      if (!isValidType && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      // If no file is selected, clear the active file for the current type
      const currentType = useFileStore.getState().fileType;
      if (currentType) {
        // Call setUploadedFileAndSyncActive with nulls. 
        // The store logic will determine actualFileType as null and won't update specific instances, 
        // but setFileType(null) within resetAllParameters is the primary mechanism for clearing active views.
        setUploadedFileAndSyncActive(null, null);
      }
    }
  };

  const handleParameterChange = (
    key: keyof PdfParameters,
    value: string
  ) => {
    // If the user clears the input (empty string after trim)
    if (value.trim() === "") {
      if (key === 'scale') {
        updatePdfParameter('scale', 1); // Default scale to 1 if cleared
      } else {
        updatePdfParameter(key, 0); // Default other params to 0 if cleared
      }
      return;
    }

    // Attempt to convert the input value to a number.
    const numValue = Number(value);

    // If the conversion results in NaN (e.g., invalid characters like "abc" or just "-"),
    // update the store with its current value. This makes the input field revert to the
    // last valid numeric state if an invalid character is typed.
    if (isNaN(numValue)) {
      updatePdfParameter(key, pdfParameters[key]); 
    } else {
      // If it's a valid number (this handles "05" -> 5, "1." -> 1 etc.), update the store.
      updatePdfParameter(key, numValue);
    }
  };

  const handleScaleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setScaleDisplayValue(newValue);

    const trimmedValue = newValue.trim();
    if (trimmedValue === "") {
      // If user clears input, set scale in store to 1 (default for scale)
      // The display will be empty until blur or next valid input that sets store
      updatePdfParameter('scale', 1);
    } else if (!trimmedValue.endsWith('.')) {
      // If not ending with a decimal, try to parse and update store
      const num = Number(trimmedValue);
      if (!isNaN(num)) {
        updatePdfParameter('scale', num);
      }
      // If NaN (e.g. "abc"), store is not updated. Display shows "abc". Blur will fix.
    }
    // If ends with '.', store is not updated with a truncated number. Display shows "1.". Blur will fix.
  };

  const handleScaleInputBlur = () => {
    const trimmedValue = scaleDisplayValue.trim();
    if (trimmedValue === "") {
      updatePdfParameter('scale', 1);
      setScaleDisplayValue("1");
    } else {
      const num = Number(trimmedValue); // "1." becomes 1, "1.2" becomes 1.2
      if (!isNaN(num)) {
        updatePdfParameter('scale', num);
        setScaleDisplayValue(num.toString()); // Sync display with what's in store
      } else {
        // Invalid content like "abc", revert to default scale in store and display
        updatePdfParameter('scale', 1);
        setScaleDisplayValue("1");
      }
    }
  };

  const handleReset = () => {
    resetAllParameters();
    resetFileInput();
  };

  return (
    <div className="w-full p-4 space-y-6 overflow-y-auto bg-gray-100 h-full border-r border-gray-300">
      <div>
        <Button onClick={handleReset} className="w-full mb-4" variant="outline">
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

      {fileType && (
        <div className="space-y-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            Upload File
          </Button>
          <Input
            type="file"
            ref={fileInputRef}
            key={fileInputKey}
            onChange={handleFileChange}
            className="hidden"
            accept={
              fileType === 'pdf'
                ? 'application/pdf'
                : fileType === 'text'
                ? 'text/plain'
                : fileType === 'html'
                ? 'text/html'
                : ''
            }
          />
        </div>
      )}

      {(fileType === 'text' || fileType === 'html') && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Text Matching</h3>
          <div className="space-y-1">
            <Label htmlFor="searchText">Search Text</Label>
            <Textarea
              id="searchText"
              placeholder="Enter text for fuzzy search..."
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSearchText(e.target.value)}
              className="w-full"
              rows={3}
            />
            <Button onClick={() => triggerSearch()} className="mt-2 w-full">
              Search
            </Button>
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
          <Button onClick={resetTextParameters} variant="outline" className="w-full">
            Reset Text Parameters
          </Button>
        </div>
      )}

      {fileType === 'pdf' && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">PDF Parameters</h3>
          {(Object.keys(pdfParameters) as Array<keyof PdfParameters>).map(
            (key) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1')} {/* Add space before caps */}
                </Label>
                {key === 'scale' ? (
                  <Input
                    id="scale"
                    type="text" // Use text to allow intermediate states like "1."
                    value={scaleDisplayValue}
                    onChange={handleScaleInputChange}
                    onBlur={handleScaleInputBlur}
                    placeholder="Enter scale (e.g., 1.0)"
                  />
                ) : (
                  <Input
                    id={key}
                    type="text"
                    value={pdfParameters[key]?.toString() || ''}
                    onChange={(e) => handleParameterChange(key, e.target.value)}
                    placeholder={`Enter ${key.toLowerCase()}`}
                  />
                )}
              </div>
            )
          )}
        </div>
      )}
      <Button onClick={handleReset} className="w-full mt-4">
        Reset All
      </Button>
    </div>
  );
};

export default ControlPanel;
