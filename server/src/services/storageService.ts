import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('CRITICAL ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not defined. File uploads will fail.');
}

// Server-side client using the service role key — never expose this key to the frontend.
const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');

// Uploads a file buffer to Supabase Storage and returns its public URL.
export const uploadFile = async (folder: string, filename: string, buffer: Buffer, contentType: string): Promise<string> => {
    const objectPath = `${folder}/${filename}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
        contentType,
        upsert: false,
    });
    if (error) {
        throw new Error(`Falha ao enviar arquivo para o storage: ${error.message}`);
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
};

// Deletes a file from Supabase Storage given its public URL (or storage-relative path).
export const deleteFile = async (publicUrlOrPath: string): Promise<void> => {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrlOrPath.indexOf(marker);
    const objectPath = idx !== -1 ? publicUrlOrPath.substring(idx + marker.length) : publicUrlOrPath;

    const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (error) {
        console.error(`Falha ao remover arquivo do storage (${objectPath}):`, error.message);
    }
};

export const generateFilename = (prefix: string, originalname: string): string => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = originalname.includes('.') ? originalname.substring(originalname.lastIndexOf('.')) : '';
    return `${prefix}${uniqueSuffix}${ext}`;
};
