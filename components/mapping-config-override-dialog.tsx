"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  Download,
  Upload,
  Settings,
  Eye,
  Edit,
  Trash2,
  Star,
  Copy,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  useMappingConfig,
  useConfigValidation,
  useConfigExportImport,
} from "@/lib/hooks/use-mapping-config";
import type {
  MappingConfiguration,
  FieldMapping,
} from "@/lib/column-alias-config";
import type { ColumnMapping } from "@/lib/advanced-excel-parser";

interface MappingConfigOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMapping?: ColumnMapping;
  detectedColumns?: string[];
  onApplyConfig?: (config: MappingConfiguration) => void;
  onSaveAsConfig?: (configName: string, description?: string) => void;
}

export function MappingConfigOverrideDialog({
  open,
  onOpenChange,
  currentMapping,
  detectedColumns = [],
  onApplyConfig,
  onSaveAsConfig,
}: MappingConfigOverrideDialogProps) {
  // State
  const [activeTab, setActiveTab] = useState<"browse" | "create" | "edit">(
    "browse",
  );
  const [selectedConfig, setSelectedConfig] =
    useState<MappingConfiguration | null>(null);
  const [editingConfig, setEditingConfig] =
    useState<Partial<MappingConfiguration> | null>(null);
  const [newConfigName, setNewConfigName] = useState("");
  const [newConfigDescription, setNewConfigDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );

  // Hooks
  const {
    configurations,
    defaultConfig,
    isLoading,
    error,
    saveConfiguration,
    updateConfiguration,
    deleteConfiguration,
    setDefaultConfiguration,
    configById,
  } = useMappingConfig();

  const { validateConfiguration, previewConfiguration } = useConfigValidation();
  const { exportConfiguration, importConfiguration } = useConfigExportImport();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setActiveTab("browse");
      setSelectedConfig(null);
      setEditingConfig(null);
      setNewConfigName("");
      setNewConfigDescription("");
      setShowDeleteConfirm(null);
    }
  }, [open]);

  // Handle configuration selection
  const handleSelectConfig = (config: MappingConfiguration) => {
    setSelectedConfig(config);
  };

  // Handle apply configuration
  const handleApplyConfig = () => {
    if (selectedConfig && onApplyConfig) {
      onApplyConfig(selectedConfig);
      onOpenChange(false);
    }
  };

  // Handle save current mapping as new configuration
  const handleSaveAsNew = async () => {
    if (!newConfigName.trim()) return;

    try {
      if (onSaveAsConfig) {
        onSaveAsConfig(
          newConfigName.trim(),
          newConfigDescription.trim() || undefined,
        );
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
  };

  // Handle edit configuration
  const handleEditConfig = (config: MappingConfiguration) => {
    setEditingConfig({ ...config });
    setActiveTab("edit");
  };

  // Handle save edited configuration
  const handleSaveEdit = async () => {
    if (!editingConfig?.id) return;

    try {
      await updateConfiguration(editingConfig.id, editingConfig);
      setEditingConfig(null);
      setActiveTab("browse");
    } catch (error) {
      console.error("Failed to update configuration:", error);
    }
  };

  // Handle delete configuration
  const handleDeleteConfig = async (configId: number) => {
    try {
      await deleteConfiguration(configId);
      setShowDeleteConfirm(null);
      if (selectedConfig?.id === configId) {
        setSelectedConfig(null);
      }
    } catch (error) {
      console.error("Failed to delete configuration:", error);
    }
  };

  // Handle set as default
  const handleSetDefault = async (configId: number) => {
    try {
      await setDefaultConfiguration(configId);
    } catch (error) {
      console.error("Failed to set default configuration:", error);
    }
  };

  // Handle export configuration
  const handleExport = (configId: number) => {
    try {
      exportConfiguration(configId);
    } catch (error) {
      console.error("Failed to export configuration:", error);
    }
  };

  // Handle import configuration
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importConfiguration(file);
      event.target.value = ""; // Reset input
    } catch (error) {
      console.error("Failed to import configuration:", error);
    }
  };

  // Render configuration preview
  const renderConfigPreview = (config: MappingConfiguration) => {
    const preview = previewConfiguration(config);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Mappings:</span>
            <span className="ml-2">{preview.totalMappings}</span>
          </div>
          <div>
            <span className="font-medium">Avg Confidence:</span>
            <span className="ml-2">{preview.averageConfidence}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Mapping Types:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Exact:</span>
              <Badge variant="outline">{preview.mappingTypes.exact}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Fuzzy:</span>
              <Badge variant="outline">{preview.mappingTypes.fuzzy}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Manual:</span>
              <Badge variant="outline">{preview.mappingTypes.manual}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Alias:</span>
              <Badge variant="outline">{preview.mappingTypes.alias}</Badge>
            </div>
          </div>
        </div>

        {preview.lowConfidenceCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {preview.lowConfidenceCount} mappings có confidence thấp (&lt;50%)
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // Render browse tab
  const renderBrowseTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Available Configurations</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("create")}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Current
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-2">
          {configurations.map((config) => (
            <Card
              key={config.id}
              className={`cursor-pointer transition-colors ${
                selectedConfig?.id === config.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => handleSelectConfig(config)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{config.config_name}</h4>
                      {config.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {!config.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {config.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {config.field_mappings?.length || 0} mappings • Created by{" "}
                      {config.created_by}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditConfig(config);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(config.id!);
                      }}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    {!config.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(config.id!);
                        }}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(config.id!);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {selectedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuration Preview</CardTitle>
          </CardHeader>
          <CardContent>{renderConfigPreview(selectedConfig)}</CardContent>
        </Card>
      )}
    </div>
  );

  // Render create tab
  const renderCreateTab = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <Label htmlFor="config-name">Configuration Name</Label>
          <Input
            id="config-name"
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
            placeholder="Enter configuration name..."
          />
        </div>

        <div>
          <Label htmlFor="config-description">Description (Optional)</Label>
          <Textarea
            id="config-description"
            value={newConfigDescription}
            onChange={(e) => setNewConfigDescription(e.target.value)}
            placeholder="Describe this configuration..."
            rows={3}
          />
        </div>
      </div>

      {currentMapping && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Mapping Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                This configuration will save{" "}
                {Object.keys(currentMapping).length} field mappings.
              </p>
              <div className="max-h-32 overflow-y-auto">
                <div className="space-y-1 text-xs">
                  {Object.entries(currentMapping).map(
                    ([dbField, excelColumn]) => (
                      <div key={dbField} className="flex justify-between">
                        <span className="font-mono">{dbField}</span>
                        <span className="text-gray-500">→ {excelColumn}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Mapping Configuration Override</DialogTitle>
            <DialogDescription>
              Browse, create, or edit mapping configurations for import
              processes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-4">
              <Button
                variant={activeTab === "browse" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("browse")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Browse
              </Button>
              <Button
                variant={activeTab === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("create")}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current
              </Button>
              {editingConfig && (
                <Button
                  variant={activeTab === "edit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("edit")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            {/* Tab Content */}
            <div className="overflow-y-auto max-h-96">
              {activeTab === "browse" && renderBrowseTab()}
              {activeTab === "create" && renderCreateTab()}
              {activeTab === "edit" && editingConfig && (
                <div className="space-y-4">
                  <div>
                    <Label>Configuration Name</Label>
                    <Input
                      value={editingConfig.config_name || ""}
                      onChange={(e) =>
                        setEditingConfig((prev) =>
                          prev
                            ? { ...prev, config_name: e.target.value }
                            : null,
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editingConfig.description || ""}
                      onChange={(e) =>
                        setEditingConfig((prev) =>
                          prev
                            ? { ...prev, description: e.target.value }
                            : null,
                        )
                      }
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingConfig.is_active}
                      onCheckedChange={(checked) =>
                        setEditingConfig((prev) =>
                          prev ? { ...prev, is_active: checked } : null,
                        )
                      }
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <div className="flex gap-2">
                {activeTab === "browse" && selectedConfig && (
                  <Button onClick={handleApplyConfig}>
                    Apply Configuration
                  </Button>
                )}
                {activeTab === "create" && (
                  <Button
                    onClick={handleSaveAsNew}
                    disabled={!newConfigName.trim()}
                  >
                    Save Configuration
                  </Button>
                )}
                {activeTab === "edit" && editingConfig && (
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm !== null}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this configuration? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                showDeleteConfirm && handleDeleteConfig(showDeleteConfirm)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
