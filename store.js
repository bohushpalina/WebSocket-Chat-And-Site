import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

const saveChanges = (data) => fs.writeFile(dbPath, JSON.stringify(data, null, 2));

export const readData = async () => {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.log('READ ERROR:', error);
        return []; 
    }
};

export const getAll = readData;

export const getById = async (id) => {
    const data = await readData();
    return data.find(item => item.id === id);
};

export const create = async (newItem) => {
    console.log('CREATE CALLED', newItem);
    const data = await readData();
    newItem.id = Date.now().toString(); 
    data.push(newItem);
    console.log('DATA BEFORE SAVE', data);
    await saveChanges(data);
    return newItem;
};

export const updateById = async (id, updatedFields) => {
    const data = await readData();
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
        data[index] = { ...data[index], ...updatedFields, id };
        await saveChanges(data);
        return data[index];
    }
    return null;
};

export const deleteById = async (id) => {
    let data = await readData();
    const initialLength = data.length;
    data = data.filter(item => item.id !== id);
    if (data.length !== initialLength) {
        await saveChanges(data);
        return true;
    }
    return false;
};

// Функция для поиска, сортировки
export const getFilteredData = async ({ search = '', sort = '', page = 1, limit = 4 }) => {
    let data = await readData();

    // 1. Поиск по названию (регистронезависимый)
    if (search) {
        const lowerSearch = search.toLowerCase();
        data = data.filter(item => item.title.toLowerCase().includes(lowerSearch));
    }

    // 2. Сортировка по названию
    if (sort === 'asc') {
        data.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'desc') {
        data.sort((a, b) => b.title.localeCompare(a.title));
    }

    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const currentPage = Math.min(Math.max(1, Number(page)), totalPages); 
    const offset = (currentPage - 1) * limit;
    
    const paginatedData = data.slice(offset, offset + limit);

    return {
        items: paginatedData,
        totalItems,
        totalPages,
        currentPage,
        search,
        sort
    };
};