"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import {
  FileSpreadsheet,
  Search,
  Filter,
  X,
  Trophy,
  Zap,
  Trash2,
  Text,
  Files,
  RefreshCw,
  Database,
  AlertCircle,
  Copy,
  ExternalLink,
  CheckCircle,
  Play,
  Save,
  Trash,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as XLSX from "xlsx"
import {
  saveExcelFile,
  loadExcelFiles,
  updateTodoStatus,
  deleteExcelFile,
  convertDBTodoToAppTodo,
  type TodoItem,
  type TodoStatus,
  saveAllChanges,
  deleteTodo,
  scheduleAutoSave,
} from "@/lib/database"
import { testConnection, checkTablesExist, createTables } from "@/lib/supabase"
import type { ExcelFileWithTodos } from "@/lib/supabase"

const statusConfig: Record<
  TodoStatus,
  {
    label: string
    color: string
    badge: "secondary" | "default" | "destructive"
    glowClass: string
  }
> = {
  pendiente: {
    label: "Pendiente",
    color: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300",
    badge: "secondary",
    glowClass: "hover:shadow-lg hover:shadow-gray-200/50",
  },
  "en-proceso": {
    label: "En Proceso",
    color: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300",
    badge: "default",
    glowClass: "hover:shadow-lg hover:shadow-blue-200/50",
  },
  completado: {
    label: "Completado",
    color: "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300",
    badge: "default",
    glowClass: "hover:shadow-lg hover:shadow-green-200/50",
  },
  cancelado: {
    label: "Cancelado",
    color: "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300",
    badge: "destructive",
    glowClass: "hover:shadow-lg hover:shadow-red-200/50",
  },
} as const

// Componente de elementos flotantes de fondo
const FloatingElements = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Elementos geométricos flotantes - ocultos en móvil */}
      <div className="hidden md:block floating-element absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-xl"></div>
      <div className="hidden md:block floating-element absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-pink-400/10 to-red-400/10 rounded-full blur-xl"></div>
      <div className="hidden lg:block floating-element absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-xl"></div>
      <div className="hidden lg:block floating-element absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-xl"></div>
      <div className="hidden md:block floating-element absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-xl"></div>

      {/* Formas geométricas adicionales - solo desktop */}
      <div className="hidden xl:block floating-element absolute top-32 right-1/3 w-12 h-12 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rotate-45 blur-sm"></div>
      <div className="hidden xl:block floating-element absolute bottom-32 left-1/3 w-8 h-8 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rotate-12 blur-sm"></div>
    </div>
  )
}

// Componente de barra de progreso mejorada
const ProgressBar = ({ percentage }: { percentage: number }) => {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div
          className={`text-4xl font-bold transition-all duration-500 ${
            percentage === 100
              ? "text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600"
              : "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
          }`}
        >
          {Math.round(percentage)}%
        </div>
        {percentage === 100 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex items-center gap-2 text-green-600 animate-bounce">
              <Star className="w-5 h-5 fill-current" />
              <Trophy className="w-6 h-6 fill-current" />
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="ml-2">
              <span className="font-bold text-green-600">¡Completado!</span>
              <Sparkles className="w-4 h-4 inline ml-1 text-yellow-500" />
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-6 overflow-hidden border border-white/30">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
              percentage === 100
                ? "bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 progress-glow"
                : percentage > 75
                  ? "bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"
                  : percentage > 50
                    ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600"
                    : "bg-gradient-to-r from-orange-400 via-red-500 to-pink-600"
            }`}
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse rounded-full" />
      </div>
    </div>
  )
}

// Componente de confetti mejorado
const Confetti = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute confetti-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            width: `${4 + Math.random() * 4}px`,
            height: `${4 + Math.random() * 4}px`,
            backgroundColor: [
              "#10b981",
              "#3b82f6",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
              "#06b6d4",
              "#84cc16",
              "#f97316",
              "#ec4899",
              "#6366f1",
            ][Math.floor(Math.random() * 10)],
            borderRadius: Math.random() > 0.5 ? "50%" : "0%",
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  )
}

// Componente de configuración inicial mejorado
const InitialSetup = ({ onSetupComplete }: { onSetupComplete: () => void }) => {
  const [setupStep, setSetupStep] = useState<"env" | "tables" | "complete">("env")
  const [isCreatingTables, setIsCreatingTables] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const sqlScript = `-- Ejecuta este script en el SQL Editor de Supabase
-- Crear tabla para archivos Excel
CREATE TABLE IF NOT EXISTS excel_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0
);

-- Crear tabla para las tareas individuales
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  excel_file_id UUID REFERENCES excel_files(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad TEXT,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en-proceso', 'completado', 'cancelado')),
  sheet_name TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  cell_ref TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_todos_excel_file_id ON todos(excel_file_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_excel_files_updated_at ON excel_files(updated_at DESC);`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleCreateTables = async () => {
    setIsCreatingTables(true)
    setSetupError(null)

    try {
      await createTables()
      setSetupStep("complete")
      setTimeout(() => {
        onSetupComplete()
      }, 2000)
    } catch (error) {
      console.error("Error creating tables:", error)
      setSetupError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setIsCreatingTables(false)
    }
  }

  const checkConnection = async () => {
    const isConnected = await testConnection()
    if (isConnected) {
      setSetupStep("tables")
    } else {
      setSetupError("No se pudo conectar con Supabase. Verifica las variables de entorno.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-blue-500" />
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Configuración Inicial
          </h2>
          <Sparkles className="w-8 h-8 text-purple-500" />
        </div>
        <p className="text-muted-foreground">Vamos a configurar tu aplicación paso a paso</p>
      </div>

      {setupError && (
        <Alert variant="destructive" className="glass-card border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{setupError}</AlertDescription>
        </Alert>
      )}

      {/* Paso 1: Variables de entorno */}
      {setupStep === "env" && (
        <Card className="glass-card-enhanced card-hover border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Configurar Variables de Entorno
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Primero necesitas configurar las credenciales de Supabase:</p>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-lg">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">1</span>
                  Crea el archivo .env.local
                </Label>
                <p className="text-xs text-muted-foreground mt-1">En la raíz de tu proyecto</p>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">2</span>
                  Agrega estas líneas:
                </Label>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                  <div>NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co</div>
                  <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_publica</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 glass-button bg-transparent"
                  onClick={() => copyToClipboard("NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY=")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar plantilla
                </Button>
              </div>

              <div className="glass-card p-4 rounded-lg">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">3</span>
                  Reinicia el servidor
                </Label>
                <div className="bg-gray-900 text-yellow-400 p-3 rounded-lg font-mono text-sm mt-2">npm run dev</div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={checkConnection}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Verificar Conexión
              </Button>
              <Button variant="outline" className="glass-button bg-transparent" asChild>
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ir a Supabase
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Crear tablas */}
      {setupStep === "tables" && (
        <Card className="glass-card-enhanced card-hover border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Crear Tablas de Base de Datos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />✅ Conexión con Supabase exitosa
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Ahora vamos a crear las tablas necesarias. Puedes hacerlo de dos formas:
            </p>

            <div className="grid gap-4">
              {/* Opción automática */}
              <div className="glass-card p-4 rounded-lg border-0">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Opción 1: Creación Automática (Recomendado)
                </h4>
                <p className="text-xs text-muted-foreground mb-3">La aplicación creará las tablas automáticamente</p>
                <Button
                  onClick={handleCreateTables}
                  disabled={isCreatingTables}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  {isCreatingTables ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin spinner-glow" />
                      Creando tablas...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Crear Tablas Automáticamente
                    </>
                  )}
                </Button>
              </div>

              {/* Opción manual */}
              <div className="glass-card p-4 rounded-lg border-0">
                <h4 className="font-medium text-sm mb-2">Opción 2: Creación Manual</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Copia y ejecuta el script en el SQL Editor de Supabase
                </p>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto mb-3">
                  <pre>{sqlScript}</pre>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass-button bg-transparent"
                    onClick={() => copyToClipboard(sqlScript)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Script
                  </Button>
                  <Button variant="outline" size="sm" className="glass-button bg-transparent" onClick={onSetupComplete}>
                    Ya ejecuté el script
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 3: Completado */}
      {setupStep === "complete" && (
        <Card className="glass-card border-0">
          <CardContent className="text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-20 h-20 text-green-500 glow-green" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
              ¡Configuración Completada!
            </h3>
            <p className="text-muted-foreground mb-4">Las tablas se han creado exitosamente. Redirigiendo...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto spinner-glow"></div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ExcelTodoList() {
  const [excelFiles, setExcelFiles] = useState<ExcelFileWithTodos[]>([])
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<TodoStatus | "all">("all")
  const [showConfetti, setShowConfetti] = useState(false)
  const [lastCompletedPercentage, setLastCompletedPercentage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "setup" | "error">("checking")
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Verificar conexión y tablas al iniciar
  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      setConnectionStatus("checking")
      setError(null)

      console.log("🚀 Inicializando aplicación...")

      // 1. Verificar conexión básica
      const isConnected = await testConnection()
      if (!isConnected) {
        setConnectionStatus("setup")
        setError("Configuración de Supabase requerida")
        return
      }

      // 2. Verificar si las tablas existen
      const tablesExist = await checkTablesExist()
      if (!tablesExist) {
        console.log("📋 Las tablas no existen, mostrando configuración inicial")
        setConnectionStatus("setup")
        return
      }

      // 3. Todo está listo
      setConnectionStatus("connected")
      loadFiles()
    } catch (error) {
      console.error("Error initializing app:", error)
      setConnectionStatus("setup")
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Error desconocido de inicialización")
      }
    }
  }

  const loadFiles = async () => {
    try {
      setIsLoadingFiles(true)
      setError(null)
      const files = await loadExcelFiles()
      setExcelFiles(files)

      // Si no hay archivo seleccionado y hay archivos, seleccionar el más reciente
      if (!currentFileId && files.length > 0) {
        setCurrentFileId(files[0].id)
      }
    } catch (error) {
      console.error("Error loading files:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al cargar archivos"
      setError(errorMessage)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // Archivo actual y sus tareas
  const currentFile = excelFiles.find((file) => file.id === currentFileId)
  const todos = currentFile ? currentFile.todos.map(convertDBTodoToAppTodo) : []

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (connectionStatus !== "connected") {
      setError("No hay conexión con Supabase. Verifica tu configuración.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })

      const newTodos: Omit<TodoItem, "id">[] = []

      // Procesar cada hoja del Excel
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")

        // Encontrar columnas "nombre" y "cantidad"
        let nombreColumnIndex = -1
        let cantidadColumnIndex = -1

        for (let row = range.s.r; row <= range.e.r && nombreColumnIndex === -1; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]

            if (cell && cell.v) {
              const cellValue = String(cell.v).toLowerCase()
              if (cellValue.includes("nombre") && nombreColumnIndex === -1) {
                nombreColumnIndex = col
              }
              if (cellValue.includes("cantidad") && cantidadColumnIndex === -1) {
                cantidadColumnIndex = col
              }
            }
          }
        }

        if (nombreColumnIndex === -1) {
          nombreColumnIndex = range.s.c
        }

        // Procesar todas las celdas de la columna "nombre"
        for (let row = range.s.r; row <= range.e.r; row++) {
          const nombreCellAddress = XLSX.utils.encode_cell({ r: row, c: nombreColumnIndex })
          const nombreCell = worksheet[nombreCellAddress]

          if (nombreCell && nombreCell.v !== undefined && nombreCell.v !== null) {
            const nombreValue = String(nombreCell.v).trim()

            if (nombreValue && !nombreValue.toLowerCase().includes("nombre")) {
              let cantidadValue = undefined

              if (cantidadColumnIndex !== -1) {
                const cantidadCellAddress = XLSX.utils.encode_cell({ r: row, c: cantidadColumnIndex })
                const cantidadCell = worksheet[cantidadCellAddress]
                if (cantidadCell && cantidadCell.v !== undefined && cantidadCell.v !== null) {
                  cantidadValue = String(cantidadCell.v).trim()
                }
              }

              newTodos.push({
                nombre: nombreValue,
                cantidad: cantidadValue,
                status: "pendiente",
                sheet: sheetName,
                row: row + 1,
                cellRef: nombreCellAddress,
              })
            }
          }
        }
      })

      if (newTodos.length === 0) {
        throw new Error("No se encontraron tareas válidas en el archivo")
      }

      // Guardar en Supabase
      const fileId = await saveExcelFile(file.name, newTodos)

      // Recargar archivos y seleccionar el nuevo
      await loadFiles()
      setCurrentFileId(fileId)

      console.log(`Se guardaron ${newTodos.length} tareas en Supabase`)
    } catch (error) {
      console.error("Error processing Excel file:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar el archivo"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!currentFileId) return

    try {
      setAutoSaveStatus("saving")
      await saveAllChanges(currentFileId)
      setAutoSaveStatus("saved")
      setLastSaved(new Date())
      setHasUnsavedChanges(false)

      // Recargar datos para asegurar sincronización
      await loadFiles()

      setTimeout(() => setAutoSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Error saving changes:", error)
      setAutoSaveStatus("error")
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al guardar"
      setError(errorMessage)
      setTimeout(() => setAutoSaveStatus("idle"), 3000)
    }
  }

  const handleDeleteTodo = async (todoId: string, todoName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la tarea "${todoName}"?`)) {
      return
    }

    try {
      await deleteTodo(todoId)

      // Actualizar estado local
      setExcelFiles((files) =>
        files.map((file) =>
          file.id === currentFileId
            ? {
                ...file,
                todos: file.todos.filter((todo) => todo.id !== todoId),
              }
            : file,
        ),
      )

      // Marcar como cambios sin guardar y programar auto-guardado
      setHasUnsavedChanges(true)
      if (currentFileId) {
        scheduleAutoSave(currentFileId).catch(console.error)
      }
    } catch (error) {
      console.error("Error deleting todo:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al eliminar la tarea"
      setError(errorMessage)
    }
  }

  const handleUpdateTodoStatus = async (id: string, newStatus: TodoStatus) => {
    try {
      setAutoSaveStatus("saving")
      await updateTodoStatus(id, newStatus)

      // Actualizar estado local
      setExcelFiles((files) =>
        files.map((file) =>
          file.id === currentFileId
            ? {
                ...file,
                todos: file.todos.map((todo) => (todo.id === id ? { ...todo, status: newStatus } : todo)),
              }
            : file,
        ),
      )

      // Auto-guardado exitoso
      setAutoSaveStatus("saved")
      setLastSaved(new Date())
      setHasUnsavedChanges(false)

      setTimeout(() => setAutoSaveStatus("idle"), 1500)
    } catch (error) {
      console.error("Error updating todo status:", error)
      setAutoSaveStatus("error")
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar la tarea"
      setError(errorMessage)
      setTimeout(() => setAutoSaveStatus("idle"), 3000)
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar este archivo?`)) {
      return
    }

    try {
      await deleteExcelFile(fileId)

      // Actualizar estado local
      setExcelFiles((files) => files.filter((file) => file.id !== fileId))

      // Si el archivo eliminado era el actual, seleccionar el siguiente más reciente
      if (currentFileId === fileId) {
        const nextFileId = excelFiles.length > 1 ? excelFiles[1].id : null
        setCurrentFileId(nextFileId)
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al eliminar el archivo"
      setError(errorMessage)
    }
  }

  const SaveStatus = () => {
    const getStatusIcon = () => {
      switch (autoSaveStatus) {
        case "saving":
          return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
        case "saved":
          return <CheckCircle2 className="w-4 h-4 text-green-500" />
        case "error":
          return <AlertTriangle className="w-4 h-4 text-red-500" />
        default:
          return hasUnsavedChanges ? (
            <Clock className="w-4 h-4 text-orange-500" />
          ) : (
            <Save className="w-4 h-4 text-gray-500" />
          )
      }
    }

    const getStatusText = () => {
      switch (autoSaveStatus) {
        case "saving":
          return "Guardando..."
        case "saved":
          return "Guardado"
        case "error":
          return "Error al guardar"
        default:
          return hasUnsavedChanges ? "Cambios sin guardar" : "Todo guardado"
      }
    }

    const getStatusColor = () => {
      switch (autoSaveStatus) {
        case "saving":
          return "text-blue-600"
        case "saved":
          return "text-green-600"
        case "error":
          return "text-red-600"
        default:
          return hasUnsavedChanges ? "text-orange-600" : "text-gray-600"
      }
    }

    return (
      <div
        className={`flex items-center gap-2 text-xs ${getStatusColor()} status-indicator px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm`}
      >
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
        {lastSaved && autoSaveStatus === "saved" && (
          <span className="text-gray-500">• {lastSaved.toLocaleTimeString()}</span>
        )}
      </div>
    )
  }

  // Filtrado y búsqueda
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const statusMatch = statusFilter === "all" || todo.status === statusFilter
      const searchMatch =
        searchTerm === "" ||
        todo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (todo.cantidad && todo.cantidad.toLowerCase().includes(searchTerm.toLowerCase()))

      return statusMatch && searchMatch
    })
  }, [todos, statusFilter, searchTerm])

  // Estadísticas
  const stats = useMemo(() => {
    const total = todos.length
    const pendiente = todos.filter((t) => t.status === "pendiente").length
    const enProceso = todos.filter((t) => t.status === "en-proceso").length
    const completado = todos.filter((t) => t.status === "completado").length
    const cancelado = todos.filter((t) => t.status === "cancelado").length
    const completionPercentage = total > 0 ? (completado / total) * 100 : 0

    return { total, pendiente, enProceso, completado, cancelado, completionPercentage }
  }, [todos])

  // Efecto para mostrar confetti
  useEffect(() => {
    if (stats.completionPercentage === 100 && stats.total > 0 && lastCompletedPercentage < 100) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4000)
    }
    setLastCompletedPercentage(stats.completionPercentage)
  }, [stats.completionPercentage, stats.total, lastCompletedPercentage])

  const groupedTodos = filteredTodos.reduce(
    (acc, todo) => {
      if (!acc[todo.sheet]) {
        acc[todo.sheet] = []
      }
      acc[todo.sheet].push(todo)
      return acc
    },
    {} as Record<string, TodoItem[]>,
  )

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
  }

  // Mostrar estado de carga inicial
  if (connectionStatus === "checking" || isLoadingFiles) {
    return (
      <div className="min-h-screen bg-image">
        <div className="setup-overlay min-h-screen">
          <FloatingElements />
          <div className="container mx-auto p-4 sm:p-6 max-w-7xl relative z-10">
            <div className="flex items-center justify-center py-12">
              <Card className="glass-card-enhanced border-0">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Database className="w-12 sm:w-16 h-12 sm:h-16 text-blue-400 mx-auto animate-pulse glow-blue" />
                    <p className="text-white-enhanced font-medium text-sm sm:text-base">
                      {connectionStatus === "checking" ? "Verificando conexión con Supabase..." : "Cargando datos..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar pantalla de configuración inicial
  if (connectionStatus === "setup") {
    return (
      <div className="min-h-screen bg-image">
        <div className="setup-overlay min-h-screen">
          <FloatingElements />
          <div className="container mx-auto p-4 sm:p-6 max-w-4xl relative z-10">
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white-enhanced drop-shadow-2xl">
                José Control Remitos v2
              </h1>
              <p className="text-white-enhanced/90 text-sm sm:text-base">Configuración inicial requerida</p>
            </div>

            <InitialSetup onSetupComplete={initializeApp} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      <FloatingElements />
      {showConfetti && <Confetti />}

      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl relative z-10">
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
             
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white-enhanced drop-shadow-2xl">
                José Control Remitos v2
              </h1>
              <Files className="w-8 sm:w-10 h-8 sm:h-10 text-yellow-400" />
            </div>
            <p className="text-base sm:text-lg md:text-xl text-white-enhanced px-4 drop-shadow-lg max-w-4xl mx-auto">
              Tus tareas se guardan automáticamente.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="flex items-center gap-2 bg-green-500/30 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full border border-green-400/40">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse glow-green"></div>
                <span className="text-green-100 font-medium text-xs sm:text-sm">Conectado</span>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="glass-card border-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* File Management */}
          <Card className="glass-card-enhanced border-0 card-hover">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                    Gestión de Archivos
                  </span>
                </span>
                <div className="flex items-center gap-4">
                  <SaveStatus />
                  {currentFileId && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveChanges}
                        disabled={autoSaveStatus === "saving"}
                        className="glass-button bg-transparent"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadFiles}
                        disabled={isLoadingFiles}
                        className="glass-button bg-transparent"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingFiles ? "animate-spin" : ""}`} />
                        Actualizar
                      </Button>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Upload Section */}
                <div className="space-y-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="excel-file" className="text-sm font-medium">
                      Subir nuevo archivo Excel
                    </Label>
                    <Input
                      id="excel-file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={isLoading || connectionStatus !== "connected"}
                      className="glass-card border-white/30"
                    />
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 spinner-glow"></div>
                      <span className="font-medium">Guardando en Supabase...</span>
                    </div>
                  )}
                </div>

                {/* File List */}
                {excelFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Archivos guardados ({excelFiles.length})</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {excelFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${
                            currentFileId === file.id
                              ? "glass-card border-blue-300 glow-blue"
                              : "glass-card border-white/20 hover:border-white/40"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCurrentFileId(file.id)}
                                className="text-sm font-medium truncate hover:text-blue-600 transition-colors"
                              >
                                {file.name}
                              </button>
                              {currentFileId === file.id && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                  Activo
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span>{file.total_tasks} tareas</span>
                              <span>{file.completed_tasks} completadas</span>
                              <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50/50 glass-button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Section */}
          {currentFile && (
            <Card className="glass-card-enhanced border-0 card-hover">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg">
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <span className="truncate text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                      {currentFile.name}
                    </span>
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {stats.total} total
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                      {stats.pendiente} pendientes
                    </Badge>
                    <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                      {stats.enProceso} en proceso
                    </Badge>
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      {stats.completado} completados
                    </Badge>
                    <Badge variant="destructive" className="text-xs bg-red-100 text-red-800">
                      {stats.cancelado} cancelados
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-8">
                <div className="text-center space-y-6">
                  <ProgressBar percentage={stats.completionPercentage} />
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      Progreso General
                    </h3>
                    <p className="text-muted-foreground">
                      {stats.completado} de {stats.total} tareas completadas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sincronizado con Supabase • Última actualización:{" "}
                      {new Date(currentFile.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters Section */}
          {currentFile && (
            <Card className="glass-card-enhanced border-0 card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    Filtros y Búsqueda
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search" className="text-sm font-medium">
                        Buscar por nombre o número de item
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          id="search"
                          placeholder="Buscar en nombre o cantidad..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 glass-card border-white/30"
                        />
                      </div>
                    </div>
                    <div className="sm:w-48">
                      <Label htmlFor="status-filter" className="text-sm font-medium">
                        Filtrar por estado
                      </Label>
                      <Select
                        value={statusFilter}
                        onValueChange={(value: TodoStatus | "all") => setStatusFilter(value)}
                      >
                        <SelectTrigger className="glass-card border-white/30">
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en-proceso">En Proceso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {filteredTodos.length !== todos.length && (
                      <div className="text-sm text-muted-foreground">
                        Mostrando {filteredTodos.length} de {todos.length} tareas
                      </div>
                    )}
                    {(searchTerm || statusFilter !== "all") && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="flex items-center gap-2 w-fit glass-button bg-transparent"
                      >
                        <X className="w-4 h-4" />
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Todo Lists by Sheet */}
          {Object.entries(groupedTodos).map(([sheetName, sheetTodos]) => (
            <Card key={sheetName} className="glass-card-enhanced border-0 card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                    Hoja: {sheetName}
                  </span>
                </CardTitle>
                <CardDescription>{sheetTodos.length} tareas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sheetTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 ${statusConfig[todo.status].color} ${statusConfig[todo.status].glowClass}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-3">
                            <h4
                              className={`font-semibold text-sm flex-1 ${
                                todo.status === "completado" ? "line-through opacity-75" : ""
                              }`}
                            >
                              {todo.nombre}
                            </h4>
                            {todo.cantidad && (
                              <Badge variant="outline" className="text-xs w-fit bg-white/50">
                                {todo.cantidad}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-white/30">
                              {todo.cellRef}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white/30">
                              Fila {todo.row}
                            </Badge>
                            <Badge
                              variant={statusConfig[todo.status].badge as "secondary" | "default" | "destructive"}
                              className="text-xs bg-white/40"
                            >
                              {statusConfig[todo.status].label}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={todo.status}
                            onValueChange={(value: TodoStatus) => handleUpdateTodoStatus(todo.id, value)}
                          >
                            <SelectTrigger className="w-full sm:w-32 glass-card border-white/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en-proceso">En Proceso</SelectItem>
                              <SelectItem value="completado">Completado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTodo(todo.id, todo.nombre)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50/50 px-2 glass-button"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {excelFiles.length === 0 && !isLoading && (
            <Card className="glass-card-enhanced border-0 card-hover">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-full mb-6 glow-blue">
                  <Database className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  No hay archivos guardados
                </h3>
                <p className="text-muted-foreground text-center text-sm px-4">
                  Sube tu primer archivo Excel para comenzar a gestionar tareas con Supabase
                </p>
              </CardContent>
            </Card>
          )}

          {/* No Current File */}
          {excelFiles.length > 0 && !currentFile && (
            <Card className="glass-card-enhanced border-0 card-hover">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4 rounded-full mb-6 glow-green">
                  <FileSpreadsheet className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  Selecciona un archivo
                </h3>
                <p className="text-muted-foreground text-center text-sm px-4">
                  Elige un archivo de la lista superior para ver y gestionar sus tareas
                </p>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {currentFile && filteredTodos.length === 0 && todos.length > 0 && (
            <Card className="glass-card-enhanced border-0 card-hover">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full mb-6 glow-purple">
                  <Search className="w-16 h-16 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  No se encontraron resultados
                </h3>
                <p className="text-muted-foreground text-center mb-4 text-sm px-4">
                  Intenta ajustar los filtros o términos de búsqueda
                </p>
                <Button variant="outline" onClick={clearFilters} className="glass-button bg-transparent">
                  Limpiar filtros
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
