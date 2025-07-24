"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  GitMerge, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Settings,
  Zap,
  Target
} from "lucide-react"

interface ConflictRecord {
  id: string
  employee_id: string
  salary_month: string
  existing_data: Record<string, any>
  new_data: Record<string, any>
  conflict_fields: string[]
  priority_score: number
  last_updated: string
  source: "file1" | "file2" | "manual"
}

interface ResolutionRule {
  id: string
  name: string
  description: string
  condition: string
  action: "keep_existing" | "use_new" | "merge_smart" | "manual_review" | "custom"
  priority: number
  field_rules?: Record<string, "existing" | "new" | "latest" | "highest" | "lowest" | "merge">
}

interface AdvancedConflictResolverProps {
  conflicts: ConflictRecord[]
  onResolveConflicts?: (resolutions: any[]) => void
  className?: string
}

export function AdvancedConflictResolver({
  conflicts,
  onResolveConflicts,
  className = ""
}: AdvancedConflictResolverProps) {
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set())
  const [resolutionRules, setResolutionRules] = useState<ResolutionRule[]>([
    {
      id: "rule_1",
      name: "Latest Data Priority",
      description: "Always use the most recently updated data",
      condition: "latest_timestamp",
      action: "use_new",
      priority: 1
    },
    {
      id: "rule_2", 
      name: "Salary Field Priority",
      description: "For salary fields, use highest value",
      condition: "field_type == 'salary'",
      action: "custom",
      priority: 2,
      field_rules: {
        "tien_luong_thuc_nhan_cuoi_ky": "highest",
        "luong_co_ban": "highest",
        "luong_san_pham": "highest"
      }
    },
    {
      id: "rule_3",
      name: "Smart Merge",
      description: "Merge non-conflicting fields, manual review for conflicts",
      condition: "default",
      action: "merge_smart",
      priority: 3
    }
  ])
  
  const [customRule, setCustomRule] = useState({
    name: "",
    description: "",
    condition: "",
    action: "merge_smart" as const,
    field_rules: {} as Record<string, string>
  })

  const [resolutions, setResolutions] = useState<Map<string, any>>(new Map())

  const toggleConflictSelection = useCallback((conflictId: string) => {
    setSelectedConflicts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(conflictId)) {
        newSet.delete(conflictId)
      } else {
        newSet.add(conflictId)
      }
      return newSet
    })
  }, [])

  const applyResolutionRule = useCallback((rule: ResolutionRule, conflictIds: string[]) => {
    const newResolutions = new Map(resolutions)
    
    conflictIds.forEach(conflictId => {
      const conflict = conflicts.find(c => c.id === conflictId)
      if (!conflict) return

      let resolution: any = {
        conflict_id: conflictId,
        rule_applied: rule.id,
        resolution_type: rule.action,
        resolved_data: {},
        confidence: "medium"
      }

      switch (rule.action) {
        case "keep_existing":
          resolution.resolved_data = conflict.existing_data
          resolution.confidence = "high"
          break

        case "use_new":
          resolution.resolved_data = conflict.new_data
          resolution.confidence = "high"
          break

        case "merge_smart":
          resolution.resolved_data = smartMerge(conflict.existing_data, conflict.new_data, conflict.conflict_fields)
          resolution.confidence = "medium"
          break

        case "custom":
          if (rule.field_rules) {
            resolution.resolved_data = applyFieldRules(conflict.existing_data, conflict.new_data, rule.field_rules)
            resolution.confidence = "high"
          }
          break

        case "manual_review":
          resolution.resolved_data = null
          resolution.confidence = "low"
          resolution.requires_manual_review = true
          break
      }

      newResolutions.set(conflictId, resolution)
    })

    setResolutions(newResolutions)
  }, [conflicts, resolutions])

  const smartMerge = (existing: Record<string, any>, newData: Record<string, any>, conflictFields: string[]) => {
    const merged = { ...existing }
    
    Object.keys(newData).forEach(key => {
      if (!conflictFields.includes(key)) {
        // No conflict, use new value if it's not null/empty
        if (newData[key] !== null && newData[key] !== undefined && newData[key] !== "") {
          merged[key] = newData[key]
        }
      } else {
        // Conflict exists, apply smart logic
        if (key.includes("date") || key.includes("time")) {
          // For dates, use the latest
          const existingDate = new Date(existing[key])
          const newDate = new Date(newData[key])
          merged[key] = newDate > existingDate ? newData[key] : existing[key]
        } else if (key.includes("luong") || key.includes("salary") || key.includes("tien")) {
          // For money fields, use the higher value
          const existingValue = parseFloat(existing[key]) || 0
          const newValue = parseFloat(newData[key]) || 0
          merged[key] = Math.max(existingValue, newValue)
        } else {
          // Default: use new value if it's not empty
          merged[key] = (newData[key] !== null && newData[key] !== undefined && newData[key] !== "") 
            ? newData[key] 
            : existing[key]
        }
      }
    })

    merged.updated_at = new Date().toISOString()
    return merged
  }

  const applyFieldRules = (existing: Record<string, any>, newData: Record<string, any>, fieldRules: Record<string, string>) => {
    const resolved = { ...existing }

    Object.keys(fieldRules).forEach(field => {
      const rule = fieldRules[field]
      const existingValue = existing[field]
      const newValue = newData[field]

      switch (rule) {
        case "existing":
          resolved[field] = existingValue
          break
        case "new":
          resolved[field] = newValue
          break
        case "latest":
          // Assume new data is latest
          resolved[field] = newValue
          break
        case "highest":
          const existingNum = parseFloat(existingValue) || 0
          const newNum = parseFloat(newValue) || 0
          resolved[field] = Math.max(existingNum, newNum)
          break
        case "lowest":
          const existingNumLow = parseFloat(existingValue) || Infinity
          const newNumLow = parseFloat(newValue) || Infinity
          resolved[field] = Math.min(existingNumLow, newNumLow)
          break
        case "merge":
          resolved[field] = `${existingValue} | ${newValue}`
          break
      }
    })

    resolved.updated_at = new Date().toISOString()
    return resolved
  }

  const addCustomRule = useCallback(() => {
    if (!customRule.name.trim()) return

    const newRule: ResolutionRule = {
      id: `custom_${Date.now()}`,
      name: customRule.name,
      description: customRule.description,
      condition: customRule.condition,
      action: customRule.action,
      priority: resolutionRules.length + 1,
      field_rules: customRule.field_rules
    }

    setResolutionRules(prev => [...prev, newRule])
    setCustomRule({
      name: "",
      description: "",
      condition: "",
      action: "merge_smart",
      field_rules: {}
    })
  }, [customRule, resolutionRules])

  const applyAllResolutions = useCallback(() => {
    if (onResolveConflicts) {
      const resolutionArray = Array.from(resolutions.values())
      onResolveConflicts(resolutionArray)
    }
  }, [resolutions, onResolveConflicts])

  const getConflictSeverity = (conflict: ConflictRecord) => {
    const criticalFields = ["employee_id", "salary_month", "tien_luong_thuc_nhan_cuoi_ky"]
    const hasCriticalConflict = conflict.conflict_fields.some(field => criticalFields.includes(field))
    
    if (hasCriticalConflict) return "high"
    if (conflict.conflict_fields.length > 3) return "medium"
    return "low"
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50 border-red-200"
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low": return "text-blue-600 bg-blue-50 border-blue-200"
      default: return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-purple-600" />
            Advanced Conflict Resolution
          </CardTitle>
          <CardDescription>
            Resolve data conflicts with intelligent rules and custom business logic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Conflicts:</span>
              <Badge variant="outline">{conflicts.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Selected:</span>
              <Badge variant="outline">{selectedConflicts.size}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Resolved:</span>
              <Badge variant="outline">{resolutions.size}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="conflicts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="rules">Resolution Rules</TabsTrigger>
          <TabsTrigger value="resolutions">Resolutions</TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Conflicts ({conflicts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No conflicts detected. All data can be imported without issues.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {conflicts.map((conflict) => {
                      const severity = getConflictSeverity(conflict)
                      return (
                        <div key={conflict.id} className={`border rounded-lg p-4 ${getSeverityColor(severity)}`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedConflicts.has(conflict.id)}
                              onCheckedChange={() => toggleConflictSelection(conflict.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {conflict.employee_id} - {conflict.salary_month}
                                </Badge>
                                <Badge variant="secondary">{severity} priority</Badge>
                                <Badge variant="outline">{conflict.source}</Badge>
                              </div>
                              
                              <p className="text-sm mb-2">
                                Conflicting fields: {conflict.conflict_fields.join(", ")}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-gray-700">Existing Data:</p>
                                  <div className="bg-white p-2 rounded border">
                                    {conflict.conflict_fields.map(field => (
                                      <div key={field} className="flex justify-between">
                                        <span>{field}:</span>
                                        <span>{conflict.existing_data[field]}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-700">New Data:</p>
                                  <div className="bg-white p-2 rounded border">
                                    {conflict.conflict_fields.map(field => (
                                      <div key={field} className="flex justify-between">
                                        <span>{field}:</span>
                                        <span>{conflict.new_data[field]}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolution Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Rules */}
              <div className="space-y-3">
                {resolutionRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{rule.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Priority {rule.priority}</Badge>
                        <Button
                          size="sm"
                          onClick={() => applyResolutionRule(rule, Array.from(selectedConflicts))}
                          disabled={selectedConflicts.size === 0}
                          className="flex items-center gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          Apply to Selected
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary">{rule.action}</Badge>
                      <span className="text-gray-500">Condition: {rule.condition}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Rule */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Create Custom Rule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input
                      value={customRule.name}
                      onChange={(e) => setCustomRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={customRule.action}
                      onValueChange={(value: any) => setCustomRule(prev => ({ ...prev, action: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep_existing">Keep Existing</SelectItem>
                        <SelectItem value="use_new">Use New</SelectItem>
                        <SelectItem value="merge_smart">Smart Merge</SelectItem>
                        <SelectItem value="manual_review">Manual Review</SelectItem>
                        <SelectItem value="custom">Custom Field Rules</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={customRule.description}
                      onChange={(e) => setCustomRule(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe when this rule should be applied"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={addCustomRule} disabled={!customRule.name.trim()}>
                      Add Custom Rule
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolutions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applied Resolutions ({resolutions.size})</CardTitle>
            </CardHeader>
            <CardContent>
              {resolutions.size === 0 ? (
                <Alert>
                  <AlertDescription>
                    No resolutions applied yet. Go to Conflicts tab to select conflicts and apply resolution rules.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {Array.from(resolutions.values()).map((resolution) => (
                        <div key={resolution.conflict_id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Conflict {resolution.conflict_id}</Badge>
                            <Badge 
                              variant={resolution.confidence === "high" ? "default" : "secondary"}
                              className={
                                resolution.confidence === "high" ? "bg-green-100 text-green-800" :
                                resolution.confidence === "medium" ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }
                            >
                              {resolution.confidence} confidence
                            </Badge>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">Resolution:</span> {resolution.resolution_type}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Rule:</span> {resolution.rule_applied}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-center pt-4 border-t">
                    <Button
                      onClick={applyAllResolutions}
                      className="flex items-center gap-2"
                    >
                      <Target className="h-4 w-4" />
                      Apply All Resolutions ({resolutions.size})
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
