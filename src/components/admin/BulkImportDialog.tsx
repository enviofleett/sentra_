import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkImportDialogProps {
  onSuccess: () => void;
}

interface ParsedProduct {
  name: string;
  price: number;
  cost_price?: number;
  brand?: string;
  stock?: number;
}

interface ImportLog {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

export function BulkImportDialog({ onSuccess }: BulkImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'idle' | 'parsing' | 'creating' | 'enriching' | 'complete'>('idle');
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [stats, setStats] = useState({ total: 0, created: 0, enriched: 0, failed: 0 });

  const addLog = useCallback((type: ImportLog['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  const downloadSampleCSV = () => {
    const sampleData = `name,price,cost_price,brand,stock
Dior Sauvage EDP 100ml,85000,55000,Dior,10
Chanel Bleu de Chanel EDT 150ml,120000,78000,Chanel,5
Tom Ford Oud Wood 50ml,250000,165000,Tom Ford,3
Versace Eros EDT 100ml,45000,28000,,15
Creed Aventus 100ml,350000,230000,,2`;
    
    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isValidType = selectedFile.name.endsWith('.csv') || 
                          selectedFile.name.endsWith('.xlsx') || 
                          selectedFile.name.endsWith('.xls');
      if (!isValidType) {
        toast.error('Please select a CSV or Excel file');
        return;
      }
      setFile(selectedFile);
      setLogs([]);
      setProgress(0);
      setCurrentStep('idle');
      setStats({ total: 0, created: 0, enriched: 0, failed: 0 });
    }
  };

  const parseCSV = (file: File): Promise<ParsedProduct[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const products: ParsedProduct[] = [];
          const errors: string[] = [];

          results.data.forEach((row: any, index: number) => {
            // Handle name column (case-insensitive)
            const name = row.name?.trim() || row.Name?.trim() || row.NAME?.trim();
            
            // Handle price column (case-insensitive)
            const priceStr = row.price?.toString() || row.Price?.toString() || row.PRICE?.toString();
            
            // Handle cost_price column (case-insensitive)
            const costPriceStr = row.cost_price?.toString() || row.costPrice?.toString() || 
                                 row.Cost_Price?.toString() || row.CostPrice?.toString() ||
                                 row.cost?.toString() || row.Cost?.toString() || row.COST_PRICE?.toString();
            
            // Handle brand column (case-insensitive)
            const brand = row.brand?.trim() || row.Brand?.trim() || row.BRAND?.trim();
            
            // Handle stock column (case-insensitive)
            const stockStr = row.stock?.toString() || row.Stock?.toString() || row.STOCK?.toString() || 
                            row.quantity?.toString() || row.Quantity?.toString();

            if (!name) {
              errors.push(`Row ${index + 2}: Missing product name`);
              return;
            }

            const price = parseFloat(priceStr?.replace(/[^0-9.]/g, '') || '0');
            if (isNaN(price) || price <= 0) {
              errors.push(`Row ${index + 2}: Invalid price for "${name}"`);
              return;
            }

            // Parse cost_price (optional)
            let costPrice: number | undefined;
            if (costPriceStr) {
              const parsed = parseFloat(costPriceStr.replace(/[^0-9.]/g, ''));
              if (!isNaN(parsed) && parsed > 0) {
                costPrice = parsed;
              }
            }

            // Parse stock (optional, default to 0)
            const stock = stockStr ? parseInt(stockStr.replace(/[^0-9]/g, ''), 10) : 0;

            products.push({ 
              name, 
              price, 
              cost_price: costPrice,
              brand: brand || undefined,
              stock: isNaN(stock) ? 0 : stock 
            });
          });

          if (errors.length > 0) {
            errors.forEach(err => addLog('warning', err));
          }

          resolve(products);
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsImporting(true);
    setLogs([]);
    setProgress(0);

    try {
      // Step 1: Parse CSV
      setCurrentStep('parsing');
      addLog('info', 'Parsing CSV file...');
      
      const products = await parseCSV(file);
      
      if (products.length === 0) {
        addLog('error', 'No valid products found in the file');
        toast.error('No valid products found in the file');
        setIsImporting(false);
        return;
      }

      addLog('success', `Parsed ${products.length} products from file`);
      
      // Log summary of parsed data
      const withBrand = products.filter(p => p.brand).length;
      const withCost = products.filter(p => p.cost_price).length;
      addLog('info', `With brand: ${withBrand}, With cost price: ${withCost}`);
      
      setStats(prev => ({ ...prev, total: products.length }));

      // Step 2: Create products as drafts
      setCurrentStep('creating');
      addLog('info', 'Creating products as drafts...');

      const productInserts = products.map(p => ({
        name: p.name,
        price: p.price,
        cost_price: p.cost_price || null,
        brand: p.brand || null,
        stock_quantity: p.stock || 0,
        is_active: false, // Draft mode
        is_featured: false,
      }));

      const { data: createdProducts, error: insertError } = await supabase
        .from('products')
        .insert(productInserts)
        .select('id, name, brand');

      if (insertError) {
        addLog('error', `Failed to create products: ${insertError.message}`);
        toast.error('Failed to create products');
        setIsImporting(false);
        return;
      }

      const createdCount = createdProducts?.length || 0;
      addLog('success', `Created ${createdCount} draft products`);
      setStats(prev => ({ ...prev, created: createdCount }));
      setProgress(20);

      // Step 3: Enrich products one by one
      setCurrentStep('enriching');
      setIsEnriching(true);
      addLog('info', 'Starting AI enrichment process...');

      let enrichedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < createdProducts.length; i++) {
        const product = createdProducts[i];
        const progressPercent = 20 + ((i + 1) / createdProducts.length) * 80;
        setProgress(progressPercent);

        addLog('info', `Enriching (${i + 1}/${createdProducts.length}): ${product.name}`);

        try {
          const { data, error } = await supabase.functions.invoke('enrich-product-details', {
            body: { 
              product_id: product.id, 
              product_name: product.name,
              brand: product.brand || null // Pass existing brand if provided
            },
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data?.success) {
            enrichedCount++;
            const details = [];
            if (data.enrichment?.image_url) details.push('image');
            if (data.enrichment?.size && data.enrichment.size !== 'N/A') details.push('size');
            if (data.enrichment?.brand_updated) details.push('brand');
            
            const detailStr = details.length > 0 ? ` (found: ${details.join(', ')})` : '';
            addLog('success', `✓ Enriched: ${product.name}${detailStr}`);
            setStats(prev => ({ ...prev, enriched: enrichedCount }));
          } else {
            throw new Error(data?.error || 'Unknown error');
          }
        } catch (err) {
          failedCount++;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          addLog('error', `✗ Failed to enrich "${product.name}": ${errorMsg}`);
          setStats(prev => ({ ...prev, failed: failedCount }));
          
          // Continue to next product even if this one fails
          continue;
        }

        // Delay between requests to avoid rate limiting (1.2 seconds)
        if (i < createdProducts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      }

      // Complete
      setCurrentStep('complete');
      setIsEnriching(false);
      setProgress(100);

      const summary = `Import complete! Created: ${createdCount}, Enriched: ${enrichedCount}, Failed: ${failedCount}`;
      addLog('success', summary);
      
      if (failedCount === 0) {
        toast.success(summary);
      } else {
        toast.warning(summary);
      }

      onSuccess();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog('error', `Import failed: ${errorMsg}`);
      toast.error(`Import failed: ${errorMsg}`);
    } finally {
      setIsImporting(false);
      setIsEnriching(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setLogs([]);
    setProgress(0);
    setCurrentStep('idle');
    setStats({ total: 0, created: 0, enriched: 0, failed: 0 });
  };

  const getLogIcon = (type: ImportLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
      default:
        return <Loader2 className="h-4 w-4 text-muted-foreground flex-shrink-0 animate-spin" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Product Import with AI Enrichment</DialogTitle>
          <DialogDescription>
            Upload a CSV file with product names and prices. The system will create the products and
            automatically enrich them with descriptions, categories, images, and more using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className={`cursor-pointer flex flex-col items-center gap-2 ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to upload CSV file'}
              </span>
              <span className="text-xs text-muted-foreground">
                Required: name, price | Optional: cost_price, brand, stock
              </span>
            </label>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={downloadSampleCSV}
              className="mt-2 gap-1"
            >
              <Download className="h-3 w-3" />
              Download sample template
            </Button>
          </div>

          {/* Progress Section */}
          {currentStep !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentStep === 'parsing' && 'Parsing file...'}
                  {currentStep === 'creating' && 'Creating products...'}
                  {currentStep === 'enriching' && `Enriching products (${stats.enriched}/${stats.total})...`}
                  {currentStep === 'complete' && 'Import complete!'}
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">Total: {stats.total}</span>
                <span className="text-green-600">Created: {stats.created}</span>
                <span className="text-blue-600">Enriched: {stats.enriched}</span>
                {stats.failed > 0 && <span className="text-red-600">Failed: {stats.failed}</span>}
              </div>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <ScrollArea className="h-48 border rounded-lg p-3">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    {getLogIcon(log.type)}
                    <span className={
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'warning' ? 'text-yellow-600' :
                      log.type === 'success' ? 'text-green-600' :
                      'text-muted-foreground'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isImporting}
            >
              {currentStep === 'complete' ? 'Close' : 'Cancel'}
            </Button>
            {currentStep !== 'complete' && (
              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEnriching ? 'Enriching...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Start Import
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
