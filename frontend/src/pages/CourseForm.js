import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { courseService, categoryService, tagService } from '../services/courseService';
import { 
    FiSave, FiArrowLeft, FiImage, FiDollarSign, 
    FiGlobe, FiLock, FiTag, FiLoader
} from 'react-icons/fi';

const CourseForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        thumbnail: '',
        category_id: '',
        visibility: 'everyone',
        access_rule: 'open',
        price: 0,
        currency: 'USD',
        duration_hours: 0,
        level: 'all_levels',
        language: 'English',
        tags: []
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchCategories();
        fetchTags();
        if (isEditing) {
            fetchCourse();
        }
    }, [id]);

    const fetchCategories = async () => {
        try {
            const response = await categoryService.getCategories();
            if (response.success) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const fetchTags = async () => {
        try {
            const response = await tagService.getTags();
            if (response.success) {
                setTags(response.data);
            }
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    const fetchCourse = async () => {
        try {
            setLoading(true);
            const response = await courseService.getCourse(id);
            if (response.success) {
                const course = response.data;
                setFormData({
                    title: course.title || '',
                    description: course.description || '',
                    thumbnail: course.thumbnail || '',
                    category_id: course.category_id || '',
                    visibility: course.visibility || 'everyone',
                    access_rule: course.access_rule || 'open',
                    price: course.price || 0,
                    currency: course.currency || 'USD',
                    duration_hours: course.duration_hours || 0,
                    level: course.level || 'all_levels',
                    language: course.language || 'English',
                    tags: course.tags?.map(t => t.id) || []
                });
            }
        } catch (error) {
            toast.error('Failed to load course');
            navigate('/manage-courses');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleTagToggle = (tagId) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tagId)
                ? prev.tags.filter(id => id !== tagId)
                : [...prev.tags, tagId]
        }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Course title is required';
        }
        if (formData.access_rule === 'payment' && formData.price <= 0) {
            newErrors.price = 'Price is required for paid courses';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSaving(true);
            const data = {
                ...formData,
                category_id: formData.category_id || null,
                price: formData.access_rule === 'payment' ? formData.price : 0
            };

            let response;
            if (isEditing) {
                response = await courseService.updateCourse(id, data);
            } else {
                response = await courseService.createCourse(data);
            }

            if (response.success) {
                toast.success(isEditing ? 'Course updated successfully!' : 'Course created successfully!');
                navigate('/manage-courses');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <FiLoader className="animate-spin text-primary-600" size={32} />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/manage-courses')}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                            <FiArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isEditing ? 'Edit Course' : 'Create New Course'}
                            </h1>
                            <p className="text-gray-600">
                                {isEditing ? 'Update your course details' : 'Fill in the details to create a new course'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                        
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Course Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., Introduction to JavaScript"
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                        errors.title ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Describe what students will learn in this course..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Thumbnail URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FiImage className="inline mr-1" />
                                    Thumbnail URL
                                </label>
                                <input
                                    type="url"
                                    name="thumbnail"
                                    value={formData.thumbnail}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {/* Category & Level */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        name="category_id"
                                        value={formData.category_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Level
                                    </label>
                                    <select
                                        name="level"
                                        value={formData.level}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="all_levels">All Levels</option>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            {/* Duration & Language */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration (hours)
                                    </label>
                                    <input
                                        type="number"
                                        name="duration_hours"
                                        value={formData.duration_hours}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.5"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Language
                                    </label>
                                    <select
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="English">English</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Access Settings */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Settings</h2>
                        
                        <div className="space-y-4">
                            {/* Visibility */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiGlobe className="inline mr-1" />
                                    Visibility
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                                        formData.visibility === 'everyone' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="everyone"
                                            checked={formData.visibility === 'everyone'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Everyone</div>
                                            <div className="text-sm text-gray-500">Visible to all visitors</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                                        formData.visibility === 'signed_in' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="signed_in"
                                            checked={formData.visibility === 'signed_in'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Signed In Only</div>
                                            <div className="text-sm text-gray-500">Only logged-in users</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Access Rule */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FiLock className="inline mr-1" />
                                    Access Rule
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    <label className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                                        formData.access_rule === 'open' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="access_rule"
                                            value="open"
                                            checked={formData.access_rule === 'open'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className="font-medium text-gray-900">Open</div>
                                        <div className="text-xs text-gray-500 text-center">Free enrollment</div>
                                    </label>
                                    <label className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                                        formData.access_rule === 'invitation' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="access_rule"
                                            value="invitation"
                                            checked={formData.access_rule === 'invitation'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className="font-medium text-gray-900">Invitation</div>
                                        <div className="text-xs text-gray-500 text-center">Invite only</div>
                                    </label>
                                    <label className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                                        formData.access_rule === 'payment' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="access_rule"
                                            value="payment"
                                            checked={formData.access_rule === 'payment'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className="font-medium text-gray-900">Paid</div>
                                        <div className="text-xs text-gray-500 text-center">Requires payment</div>
                                    </label>
                                </div>
                            </div>

                            {/* Price - Only shown for paid courses */}
                            {formData.access_rule === 'payment' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <FiDollarSign className="inline mr-1" />
                                            Price <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                                errors.price ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                        {errors.price && (
                                            <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Currency
                                        </label>
                                        <select
                                            name="currency"
                                            value={formData.currency}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="INR">INR (₹)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            <FiTag className="inline mr-2" />
                            Tags
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">Select tags to help students find your course</p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleTagToggle(tag.id)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                        formData.tags.includes(tag.id)
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex items-center justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/manage-courses')}
                            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <FiLoader className="animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave className="mr-2" />
                                    {isEditing ? 'Update Course' : 'Create Course'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default CourseForm;
