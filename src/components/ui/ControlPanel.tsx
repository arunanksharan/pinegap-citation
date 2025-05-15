'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  useFileStore,
  FileType,
  PdfParameters,
  HtmlParameters,
} from '@/store/useFileStore';
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
    htmlParameters,
    updateHtmlParameter,
    searchText,
    setSearchText,
    fuseScoreThreshold,
    setFuseScoreThreshold,
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

  const [scaleDisplayValue, setScaleDisplayValue] = useState<string>(
    pdfParameters.scale.toString()
  );

  const [htmlScaleDisplayValue, setHtmlScaleDisplayValue] = useState<string>(
    htmlParameters.scale.toString()
  );

  const [thresholdDisplayValue, setThresholdDisplayValue] = useState<string>(
    fuseScoreThreshold.toString()
  );

  useEffect(() => {
    const storeValStr = pdfParameters.scale.toString();

    if (
      scaleDisplayValue.endsWith('.') &&
      Number(scaleDisplayValue.slice(0, -1)) === pdfParameters.scale
    ) {
      return;
    }

    if (scaleDisplayValue.trim() === '' && pdfParameters.scale === 1) {
      setScaleDisplayValue('1');
      return;
    }

    if (scaleDisplayValue !== storeValStr) {
      setScaleDisplayValue(storeValStr);
    }
  }, [pdfParameters.scale, scaleDisplayValue]);

  useEffect(() => {
    const storeValStr = htmlParameters.scale.toString();
    if (
      htmlScaleDisplayValue.endsWith('.') &&
      Number(htmlScaleDisplayValue.slice(0, -1)) === htmlParameters.scale
    ) {
      return;
    }
    if (htmlScaleDisplayValue.trim() === '' && htmlParameters.scale === 1) {
      setHtmlScaleDisplayValue('1');
      return;
    }
    if (htmlScaleDisplayValue !== storeValStr) {
      setHtmlScaleDisplayValue(storeValStr);
    }
  }, [htmlParameters.scale, htmlScaleDisplayValue]);

  useEffect(() => {
    const storeValStr = fuseScoreThreshold.toString();
    if (
      thresholdDisplayValue.endsWith('.') &&
      Number(thresholdDisplayValue.slice(0, -1)) === fuseScoreThreshold
    ) {
      return;
    }
    if (thresholdDisplayValue.trim() === '' && fuseScoreThreshold === 0.4) {
      setThresholdDisplayValue(fuseScoreThreshold.toString());
      return;
    }
    if (thresholdDisplayValue !== storeValStr) {
      setThresholdDisplayValue(storeValStr);
    }
  }, [fuseScoreThreshold, thresholdDisplayValue]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
          fileReader.onload = () => {
            const textContent = fileReader.result as string;
            setUploadedFileAndSyncActive(file, textContent);
          };
          fileReader.onerror = () => {
            console.error('Error reading text file.');
            alert('Error reading text file.');
            setUploadedFileAndSyncActive(null, null);
          };
          fileReader.readAsText(file);
        } else {
          alert('Invalid file type. Expected Text (.txt).');
        }
      } else if (currentSelectedType === 'html') {
        if (file.type === 'text/html') {
          isValidType = true;
          const fileReader = new FileReader();
          fileReader.onload = () => {
            const htmlContent = fileReader.result as string;
            setUploadedFileAndSyncActive(file, htmlContent);
          };
          fileReader.onerror = () => {
            console.error('Error reading HTML file.');
            alert('Error reading HTML file.');
            setUploadedFileAndSyncActive(null, null);
          };
          fileReader.readAsText(file);
        } else {
          alert('Invalid file type. Expected HTML (.html).');
        }
      }

      if (!isValidType && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      const currentType = useFileStore.getState().fileType;
      if (currentType) {
        setUploadedFileAndSyncActive(null, null);
      }
    }
  };

  const handleParameterChange = (key: keyof PdfParameters, value: string) => {
    const numericKeys: Array<keyof PdfParameters> = [
      'pageNumber',
      'x',
      'y',
      'boxWidth',
      'boxHeight',
      'pageWidth',
      'pageHeight',
    ];

    if (numericKeys.includes(key)) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        updatePdfParameter(key, numValue as PdfParameters[keyof PdfParameters]);
      } else {
        updatePdfParameter(key, 0 as number);
      }
    }
  };

  const handleHtmlParameterChange = (
    key: keyof HtmlParameters,
    value: string
  ) => {
    const numericKeys: Array<keyof HtmlParameters> = [
      'pageNumber',
      'x',
      'y',
      'boxWidth',
      'boxHeight',
    ];

    if (numericKeys.includes(key)) {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        updateHtmlParameter(
          key,
          numValue as HtmlParameters[keyof HtmlParameters]
        );
      } else if (value === '') {
        updateHtmlParameter(key, 0 as number);
      }
    }
  };

  const handleScaleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setScaleDisplayValue(newValue);

    const trimmedValue = newValue.trim();
    if (trimmedValue === '') {
      updatePdfParameter('scale', 1);
    } else if (!trimmedValue.endsWith('.')) {
      const num = Number(trimmedValue);
      if (!isNaN(num)) {
        updatePdfParameter('scale', num);
      }
    }
  };

  const handleHtmlScaleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;
    setHtmlScaleDisplayValue(val);

    if (val.trim() === '' || val.endsWith('.')) {
    } else {
      const newScale = parseFloat(val);
      if (!isNaN(newScale) && newScale > 0) {
        updateHtmlParameter('scale', newScale);
      } else if (val.trim() !== '' && isNaN(newScale)) {
      }
    }
  };

  const handleScaleInputBlur = () => {
    const trimmedValue = scaleDisplayValue.trim();
    if (trimmedValue === '') {
      updatePdfParameter('scale', 1);
      setScaleDisplayValue('1');
    } else {
      const num = Number(trimmedValue);
      if (!isNaN(num)) {
        updatePdfParameter('scale', num);
        setScaleDisplayValue(num.toString());
      } else {
        updatePdfParameter('scale', 1);
        setScaleDisplayValue('1');
      }
    }
  };

  const handleHtmlScaleInputBlur = () => {
    let newScale = parseFloat(htmlScaleDisplayValue);
    if (isNaN(newScale) || newScale <= 0) {
      newScale = 1;
      setHtmlScaleDisplayValue(newScale.toString());
    }
    updateHtmlParameter('scale', newScale);
    setHtmlScaleDisplayValue(
      useFileStore.getState().htmlParameters.scale.toString()
    );
  };

  const handleThresholdInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value } = e.target;

    if (value === '' || /^[0-9]*\.?([0-9]+)?$/.test(value)) {
      setThresholdDisplayValue(value);

      if (!value.endsWith('.') && value.trim() !== '') {
        const numVal = parseFloat(value);
        if (!isNaN(numVal)) {
          setFuseScoreThreshold(numVal);
        }
      }
    }
  };

  const handleThresholdInputBlur = () => {
    const numValue = parseFloat(thresholdDisplayValue);

    if (isNaN(numValue)) {
      setFuseScoreThreshold(0.4);
    } else {
      setFuseScoreThreshold(numValue);
    }
    setThresholdDisplayValue(
      useFileStore.getState().fuseScoreThreshold.toString()
    );
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

      {/* Text Matching Section - Show only for Text files */}
      {fileType === 'text' && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Text Matching</h3>
          <div className="space-y-1">
            <Label htmlFor="searchText">Search Text</Label>
            <Textarea
              id="searchText"
              placeholder="Enter text for exact search..."
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setSearchText(e.target.value)
              }
              className="w-full"
              rows={3}
            />
            <Button onClick={() => triggerSearch()} className="mt-2 w-full">
              Search
            </Button>
          </div>
          {/* <div className="space-y-1">
            <Label htmlFor="fuseScoreThreshold">
              Match Score Threshold (0.0 - 1.0)
            </Label>
            <Input
              id="fuseScoreThreshold"
              type="text"
              value={thresholdDisplayValue}
              onChange={handleThresholdInputChange}
              onBlur={handleThresholdInputBlur}
              placeholder="e.g., 0.4 (0.0=exact, 1.0=any)"
            />
          </div> */}
          <div className="space-y-1">
            <Label htmlFor="highlightColor">Highlight Color</Label>
            <Input
              id="highlightColor"
              type="color"
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)}
            />
          </div>
          {/* <div className="flex items-center space-x-2">
            <Switch
              id="caseSensitive"
              checked={isCaseSensitive}
              onCheckedChange={setIsCaseSensitive}
            />
            <Label htmlFor="caseSensitive">Case Sensitive</Label>
          </div> */}
          <Button
            onClick={resetTextParameters}
            variant="outline"
            className="w-full"
          >
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
                <Label htmlFor={`pdf-${key}`} className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </Label>
                {key === 'scale' ? (
                  <Input
                    id={`pdf-${key}`}
                    type="text"
                    value={scaleDisplayValue}
                    onChange={handleScaleInputChange}
                    onBlur={handleScaleInputBlur}
                    placeholder="Enter scale (e.g., 1.0)"
                  />
                ) : (
                  <Input
                    id={`pdf-${key}`}
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

      {fileType === 'html' && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">HTML Parameters</h3>
          {(Object.keys(htmlParameters) as Array<keyof HtmlParameters>).map(
            (key) => {
              if (key === 'pageWidth' || key === 'pageHeight') return null;

              return (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`html-${key}`} className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </Label>
                  {key === 'scale' ? (
                    <Input
                      id={`html-${key}`}
                      type="text"
                      value={htmlScaleDisplayValue}
                      onChange={handleHtmlScaleInputChange}
                      onBlur={handleHtmlScaleInputBlur}
                      placeholder="Enter scale (e.g., 1.0)"
                    />
                  ) : (
                    <Input
                      id={`html-${key}`}
                      type="text"
                      value={htmlParameters[key]?.toString() || ''}
                      onChange={(e) =>
                        handleHtmlParameterChange(key, e.target.value)
                      }
                      placeholder={`Enter ${key.toLowerCase()}`}
                    />
                  )}
                </div>
              );
            }
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
