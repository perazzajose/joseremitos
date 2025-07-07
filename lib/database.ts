import { supabase, type TodoDB, type ExcelFileWithTodos } from "./supabase"

export type TodoStatus = "pendiente" | "en-proceso" | "completado" | "cancelado"

export interface TodoItem {
  id: string
  nombre: string
  cantidad?: string
  status: TodoStatus
  sheet: string
  row: number
  cellRef: string
}

// Guardar archivo Excel y sus tareas
export async function saveExcelFile(fileName: string, todos: Omit<TodoItem, "id">[]): Promise<string> {
  try {
    console.log("Intentando guardar archivo:", fileName, "con", todos.length, "tareas")

    // 1. Crear registro del archivo Excel
    const { data: fileData, error: fileError } = await supabase
      .from("excel_files")
      .insert({
        name: fileName,
        total_tasks: todos.length,
        completed_tasks: 0,
      })
      .select()
      .single()

    if (fileError) {
      console.error("Error al insertar archivo:", fileError)
      throw new Error(`Error al guardar archivo: ${fileError.message}`)
    }

    console.log("Archivo guardado con ID:", fileData.id)

    // 2. Preparar datos de las tareas
    const todosToInsert = todos.map((todo) => ({
      excel_file_id: fileData.id,
      nombre: todo.nombre,
      cantidad: todo.cantidad || null,
      status: todo.status,
      sheet_name: todo.sheet,
      row_number: todo.row,
      cell_ref: todo.cellRef,
    }))

    console.log("Insertando", todosToInsert.length, "tareas")

    // 3. Insertar todas las tareas
    const { error: todosError } = await supabase.from("todos").insert(todosToInsert)

    if (todosError) {
      console.error("Error al insertar tareas:", todosError)
      // Limpiar el archivo si falló la inserción de tareas
      await supabase.from("excel_files").delete().eq("id", fileData.id)
      throw new Error(`Error al guardar tareas: ${todosError.message}`)
    }

    console.log("Tareas guardadas exitosamente")
    return fileData.id
  } catch (error) {
    console.error("Error saving Excel file:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al guardar el archivo")
  }
}

// Cargar todos los archivos Excel con sus tareas
export async function loadExcelFiles(): Promise<ExcelFileWithTodos[]> {
  try {
    console.log("Cargando archivos Excel desde Supabase...")

    const { data, error } = await supabase
      .from("excel_files")
      .select(`
        *,
        todos (*)
      `)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error al cargar archivos:", error)
      throw new Error(`Error al cargar archivos: ${error.message}`)
    }

    console.log("Archivos cargados:", data?.length || 0)
    return (data as ExcelFileWithTodos[]) || []
  } catch (error) {
    console.error("Error loading Excel files:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al cargar archivos")
  }
}

// Cargar un archivo específico con sus tareas
export async function loadExcelFile(fileId: string): Promise<ExcelFileWithTodos | null> {
  try {
    const { data, error } = await supabase
      .from("excel_files")
      .select(`
        *,
        todos (*)
      `)
      .eq("id", fileId)
      .single()

    if (error) {
      console.error("Error al cargar archivo específico:", error)
      throw new Error(`Error al cargar archivo: ${error.message}`)
    }

    return data as ExcelFileWithTodos
  } catch (error) {
    console.error("Error loading Excel file:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al cargar el archivo")
  }
}

// Actualizar estado de una tarea
export async function updateTodoStatus(todoId: string, newStatus: TodoStatus): Promise<void> {
  try {
    console.log("Actualizando tarea:", todoId, "a estado:", newStatus)

    const { error } = await supabase.from("todos").update({ status: newStatus }).eq("id", todoId)

    if (error) {
      console.error("Error al actualizar tarea:", error)
      throw new Error(`Error al actualizar tarea: ${error.message}`)
    }

    console.log("Tarea actualizada exitosamente")
  } catch (error) {
    console.error("Error updating todo status:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al actualizar la tarea")
  }
}

// Eliminar archivo Excel y todas sus tareas
export async function deleteExcelFile(fileId: string): Promise<void> {
  try {
    console.log("Eliminando archivo:", fileId)

    const { error } = await supabase.from("excel_files").delete().eq("id", fileId)

    if (error) {
      console.error("Error al eliminar archivo:", error)
      throw new Error(`Error al eliminar archivo: ${error.message}`)
    }

    console.log("Archivo eliminado exitosamente")
  } catch (error) {
    console.error("Error deleting Excel file:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al eliminar el archivo")
  }
}

// Convertir datos de la DB al formato de la aplicación
export function convertDBTodoToAppTodo(dbTodo: TodoDB): TodoItem {
  return {
    id: dbTodo.id,
    nombre: dbTodo.nombre,
    cantidad: dbTodo.cantidad || undefined,
    status: dbTodo.status,
    sheet: dbTodo.sheet_name,
    row: dbTodo.row_number,
    cellRef: dbTodo.cell_ref,
  }
}

// Convertir datos de la aplicación al formato de la DB
export function convertAppTodoToDBTodo(appTodo: Omit<TodoItem, "id">, excelFileId: string) {
  return {
    excel_file_id: excelFileId,
    nombre: appTodo.nombre,
    cantidad: appTodo.cantidad || null,
    status: appTodo.status,
    sheet_name: appTodo.sheet,
    row_number: appTodo.row,
    cell_ref: appTodo.cellRef,
  }
}

// Guardar cambios pendientes manualmente
export async function saveAllChanges(fileId: string): Promise<void> {
  try {
    console.log("💾 Guardando todos los cambios para el archivo:", fileId)

    // Actualizar timestamp del archivo para indicar que se guardó
    const { error } = await supabase
      .from("excel_files")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", fileId)

    if (error) {
      console.error("Error al guardar cambios:", error)
      throw new Error(`Error al guardar cambios: ${error.message}`)
    }

    console.log("✅ Cambios guardados exitosamente")
  } catch (error) {
    console.error("Error saving changes:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al guardar cambios")
  }
}

// Eliminar una tarea específica
export async function deleteTodo(todoId: string): Promise<void> {
  try {
    console.log("🗑️ Eliminando tarea:", todoId)

    const { error } = await supabase.from("todos").delete().eq("id", todoId)

    if (error) {
      console.error("Error al eliminar tarea:", error)
      throw new Error(`Error al eliminar tarea: ${error.message}`)
    }

    console.log("✅ Tarea eliminada exitosamente")
  } catch (error) {
    console.error("Error deleting todo:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al eliminar la tarea")
  }
}

// Función para auto-guardado con debounce
let autoSaveTimeout: NodeJS.Timeout | null = null

export function scheduleAutoSave(fileId: string, delay = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Cancelar auto-guardado anterior si existe
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    // Programar nuevo auto-guardado
    autoSaveTimeout = setTimeout(async () => {
      try {
        await saveAllChanges(fileId)
        resolve()
      } catch (error) {
        reject(error)
      }
    }, delay)
  })
}
