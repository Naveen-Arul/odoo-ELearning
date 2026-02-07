import api from './api';

// Course APIs
export const courseService = {
    // Get all courses (for admin/instructor)
    getCourses: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.category_id) queryParams.append('category_id', params.category_id);
        if (params.is_published !== undefined) queryParams.append('is_published', params.is_published);
        
        const response = await api.get(`/courses?${queryParams.toString()}`);
        return response.data;
    },

    // Get single course
    getCourse: async (id) => {
        const response = await api.get(`/courses/${id}`);
        return response.data;
    },

    // Get course with lessons
    getCourseWithLessons: async (id) => {
        const response = await api.get(`/courses/${id}/full`);
        return response.data;
    },

    // Create course
    createCourse: async (courseData) => {
        const response = await api.post('/courses', courseData);
        return response.data;
    },

    // Update course
    updateCourse: async (id, courseData) => {
        const response = await api.put(`/courses/${id}`, courseData);
        return response.data;
    },

    // Delete course
    deleteCourse: async (id) => {
        const response = await api.delete(`/courses/${id}`);
        return response.data;
    },

    // Publish course
    publishCourse: async (id) => {
        const response = await api.put(`/courses/${id}/publish`);
        return response.data;
    },

    // Unpublish course
    unpublishCourse: async (id) => {
        const response = await api.put(`/courses/${id}/unpublish`);
        return response.data;
    },

    // Get course stats
    getStats: async () => {
        const response = await api.get('/courses/stats');
        return response.data;
    }
};

// Category APIs
export const categoryService = {
    getCategories: async () => {
        const response = await api.get('/categories');
        return response.data;
    },

    getCategoriesTree: async () => {
        const response = await api.get('/categories/tree');
        return response.data;
    },

    createCategory: async (data) => {
        const response = await api.post('/categories', data);
        return response.data;
    },

    updateCategory: async (id, data) => {
        const response = await api.put(`/categories/${id}`, data);
        return response.data;
    },

    deleteCategory: async (id) => {
        const response = await api.delete(`/categories/${id}`);
        return response.data;
    }
};

// Tag APIs
export const tagService = {
    getTags: async () => {
        const response = await api.get('/tags');
        return response.data;
    },

    getPopularTags: async (limit = 10) => {
        const response = await api.get(`/tags/popular?limit=${limit}`);
        return response.data;
    },

    searchTags: async (query) => {
        const response = await api.get(`/tags/search?q=${query}`);
        return response.data;
    },

    createTag: async (data) => {
        const response = await api.post('/tags', data);
        return response.data;
    },

    deleteTag: async (id) => {
        const response = await api.delete(`/tags/${id}`);
        return response.data;
    }
};

export default courseService;
