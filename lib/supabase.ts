import { createClient } from "@supabase/supabase-js"

// Verificar que las variables de entorno estén disponibles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log("🔍 Verificando variables de entorno:")
console.log("SUPABASE_URL:", supabaseUrl ? "✅ Configurada" : "❌ No encontrada")
console.log("SUPABASE_KEY:", supabaseKey ? "✅ Configurada" : "❌ No encontrada")

if (!supabaseUrl || !supabaseKey) {
  const errorMessage = `
❌ Faltan las variables de entorno de Supabase:
${!supabaseUrl ? "- NEXT_PUBLIC_SUPABASE_URL no está configurada" : ""}
${!supabaseKey ? "- NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada" : ""}

📋 Para solucionarlo:
1. Crea un archivo .env.local en la raíz del proyecto
2. Agrega estas líneas:
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_publica
3. Reinicia el servidor (npm run dev)
  `
  console.error(errorMessage)
  throw new Error("Variables de entorno de Supabase no configuradas")
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos TypeScript para la base de datos
export interface ExcelFile {
  id: string
  name: string
  uploaded_at: string
  updated_at: string
  total_tasks: number
  completed_tasks: number
}

export interface TodoDB {
  id: string
  excel_file_id: string
  nombre: string
  cantidad?: string
  status: "pendiente" | "en-proceso" | "completado" | "cancelado"
  sheet_name: string
  row_number: number
  cell_ref: string
  created_at: string
  updated_at: string
}

export interface ExcelFileWithTodos extends ExcelFile {
  todos: TodoDB[]
}

// Función para verificar la conexión básica con Supabase
export async function testConnection() {
  try {
    console.log("🔄 Probando conexión básica con Supabase...")
    console.log("URL:", supabaseUrl)
    console.log("Key (primeros 10 caracteres):", supabaseKey?.substring(0, 10) + "...")

    // Solo verificar que podemos conectar con Supabase (no verificar tablas específicas)
    const { data, error } = await supabase.auth.getSession()

    if (error && error.message.includes("Invalid API key")) {
      throw new Error("Clave API de Supabase inválida. Verifica NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    console.log("✅ Conexión básica exitosa con Supabase")
    return true
  } catch (error) {
    console.error("❌ Error de conexión con Supabase:", error)

    if (error instanceof Error) {
      console.error("Mensaje de error:", error.message)
    }

    return false
  }
}

// Función para verificar si las tablas existen
export async function checkTablesExist() {
  try {
    console.log("🔍 Verificando si las tablas existen...")

    // Intentar hacer una consulta simple a las tablas
    const { data: excelFilesData, error: excelFilesError } = await supabase.from("excel_files").select("count").limit(1)

    const { data: todosData, error: todosError } = await supabase.from("todos").select("count").limit(1)

    if (excelFilesError || todosError) {
      console.log("📋 Las tablas no existen aún - esto es normal en la primera ejecución")
      return false
    }

    console.log("✅ Las tablas existen y son accesibles")
    return true
  } catch (error) {
    console.log("📋 Las tablas no existen aún - esto es normal en la primera ejecución")
    return false
  }
}

// Función para crear las tablas automáticamente
export async function createTables() {
  try {
    console.log("🔧 Creando tablas en Supabase...")

    // Script SQL para crear las tablas
    const createTablesSQL = `
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
      CREATE INDEX IF NOT EXISTS idx_excel_files_updated_at ON excel_files(updated_at DESC);

      -- Función para actualizar el timestamp de updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Triggers para actualizar updated_at automáticamente
      DROP TRIGGER IF EXISTS update_excel_files_updated_at ON excel_files;
      CREATE TRIGGER update_excel_files_updated_at BEFORE UPDATE ON excel_files
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
      CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Función para actualizar contadores en excel_files
      CREATE OR REPLACE FUNCTION update_excel_file_counters()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Actualizar contadores cuando se modifica una tarea
          UPDATE excel_files 
          SET 
              total_tasks = (
                  SELECT COUNT(*) 
                  FROM todos 
                  WHERE excel_file_id = COALESCE(NEW.excel_file_id, OLD.excel_file_id)
              ),
              completed_tasks = (
                  SELECT COUNT(*) 
                  FROM todos 
                  WHERE excel_file_id = COALESCE(NEW.excel_file_id, OLD.excel_file_id) 
                  AND status = 'completado'
              )
          WHERE id = COALESCE(NEW.excel_file_id, OLD.excel_file_id);
          
          RETURN COALESCE(NEW, OLD);
      END;
      $$ language 'plpgsql';

      -- Trigger para actualizar contadores automáticamente
      DROP TRIGGER IF EXISTS update_counters_on_todo_change ON todos;
      CREATE TRIGGER update_counters_on_todo_change
          AFTER INSERT OR UPDATE OR DELETE ON todos
          FOR EACH ROW EXECUTE FUNCTION update_excel_file_counters();
    `

    // Ejecutar el SQL usando una función RPC personalizada o directamente
    const { error } = await supabase.rpc("exec_sql", { sql: createTablesSQL })

    if (error) {
      // Si la función RPC no existe, intentar crear las tablas una por una
      console.log("⚠️ Función exec_sql no disponible, creando tablas manualmente...")

      // Crear tabla excel_files
      const { error: error1 } = await supabase.rpc("exec", {
        sql: `CREATE TABLE IF NOT EXISTS excel_files (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_tasks INTEGER DEFAULT 0,
          completed_tasks INTEGER DEFAULT 0
        )`,
      })

      if (error1) {
        throw new Error(`Error creando tabla excel_files: ${error1.message}`)
      }

      // Crear tabla todos
      const { error: error2 } = await supabase.rpc("exec", {
        sql: `CREATE TABLE IF NOT EXISTS todos (
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
        )`,
      })

      if (error2) {
        throw new Error(`Error creando tabla todos: ${error2.message}`)
      }
    }

    console.log("✅ Tablas creadas exitosamente")
    return true
  } catch (error) {
    console.error("❌ Error creando tablas:", error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Error desconocido al crear las tablas")
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
