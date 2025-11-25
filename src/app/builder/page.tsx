'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CTAButton } from '@/gradian-ui/form-builder/form-elements';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  FileText,
  Link2,
  Building2,
  ArrowRight,
  Layers,
  Palette,
  Settings,
  RefreshCw,
  Mail,
  Code
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  FileText,
  Link2,
  Building2,
  Settings,
  Mail,
  Code,
};

interface BuilderOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  stats?: {
    label: string;
    value: number;
  }[];
  features: string[];
}

export default function BuilderPage() {
  const router = useRouter();
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [builderOptions, setBuilderOptions] = useState<BuilderOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBuilders = async () => {
      try {
        const response = await fetch('/api/builders');
        const data = await response.json();
        
        if (data.success) {
          setBuilderOptions(data.data);
        } else {
          toast.error('Failed to load builders');
        }
      } catch (error) {
        toast.error('Failed to load builders');
        console.error('Error fetching builders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBuilders();
  }, []);

  const handleCardClick = (href: string) => {
    router.push(href);
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);

    const toastId = toast.loading('Clearing schema cache...');

    try {
      const response = await fetch('/api/schemas/clear-cache', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        const reactQueryKeys: string[] = Array.isArray(data.reactQueryKeys) && data.reactQueryKeys.length > 0
          ? data.reactQueryKeys
          : ['schemas', 'companies'];
        // Clear React Query caches client-side
        if (typeof window !== 'undefined' && data.clearReactQueryCache) {
          // Dispatch event to clear React Query caches
          window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
            detail: { queryKeys: reactQueryKeys } 
          }));
          
          // Also trigger storage event for other tabs
          window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(reactQueryKeys));
          window.localStorage.removeItem('react-query-cache-cleared');
        }
        
        toast.success('Cache cleared successfully!', { id: toastId });
      } else {
        toast.error(data.error || 'Failed to clear cache', { id: toastId });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to clear cache',
        { id: toastId }
      );
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <MainLayout
      title="Builder"
      subtitle="Configure and manage your application"
      icon="Settings"
    >
      <div className="space-y-8">
        {/* Header Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between gap-4 mb-4 w-full flex-wrap">
            <p className="text-gray-600 dark:text-gray-400 text-md max-w-4xl">
              Use the builders below to configure your application.
            </p>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={isClearingCache}
                className="whitespace-nowrap"
              >
                {isClearingCache ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Cache
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Builder Cards Grid */}
        {isLoading ? (
          <BuilderSkeletonGrid />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {builderOptions.map((option, index) => {
              const Icon = iconMap[option.icon] || Settings;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card 
                  className="hover:shadow-sm transition-all duration-200 cursor-pointer group h-full border flex flex-col justify-between"
                  onClick={() => handleCardClick(option.href)}
                >
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="p-2 rounded-md"
                          style={{ backgroundColor: `${option.color}10` }}
                        >
                          <Icon 
                            className="h-5 w-5" 
                            style={{ color: option.color }}
                          />
                        </div>
                        <CardTitle className="text-lg font-semibold">{option.title}</CardTitle>
                      </div>
                      <ArrowRight 
                        className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </div>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4">
                    {/* Features List */}
                    <Label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Features</Label>
                    {option.features && option.features.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {option.features.map((feature, idx) => (
                          <div 
                            key={idx}
                            className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5"
                          >
                            <div 
                              className="w-1 h-1 rounded-full shrink-0"
                              style={{ backgroundColor: option.color }}
                            />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Stats */}
                    {option.stats && option.stats.length > 0 && (
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700 mb-3">
                        {option.stats.map((stat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            {stat.label === 'Sections' && <Layers className="h-3.5 w-3.5" />}
                            {stat.label === 'Fields' && <FileText className="h-3.5 w-3.5" />}
                            <span>{stat.value} {stat.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CTA Button */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <CTAButton
                        label={`Open ${option.title}`}
                        onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                          e?.stopPropagation();
                          handleCardClick(option.href);
                        }}
                        color={option.color}
                        icon={<Icon className="h-4 w-4" />}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 dark:bg-violet-800/30 border border-blue-200 dark:border-violet-800 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Getting Started
          </h3>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            Start by creating a schema for your entities, then define relationships between them. 
            Each builder provides a visual interface to configure your data models.
          </p>
          <div className="mb-4">
            <Button
              size="sm"
              onClick={() => router.push('/ui/components')}
              className="inline-flex items-center gap-2"
              variant="default"
            >
              <Layers className="h-4 w-4" />
              Browse UI Components
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-blue-700 dark:text-blue-200">
            <span className="font-semibold">Tip:</span>
            <span>Schemas define the structure of your data, while relation types connect different entities together.</span>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}


function BuilderSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <motion.div
          key={`builder-skeleton-${index}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="h-full"
        >
          <div className="flex h-full flex-col justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-5 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>

              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, featureIdx) => (
                  <div key={`feature-skeleton-${featureIdx}`} className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-3 border-t border-dashed border-gray-200 dark:border-gray-800 pt-4">
                {Array.from({ length: 3 }).map((_, statIdx) => (
                  <div key={`stat-skeleton-${statIdx}`} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-md" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}



