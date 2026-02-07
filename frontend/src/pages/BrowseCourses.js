import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { categoryService, tagService } from '../services/courseService';
import api from '../services/api';
import { 
    FiSearch, FiFilter, FiStar, FiClock, FiUsers, 
    FiBook, FiLoader, FiChevronRight
} from 'react-icons/fi';

const BrowseCourses = () => {
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [pagination.page, selectedCategory, selectedLevel]);

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

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('page', pagination.page);
            params.append('limit', pagination.limit);
            if (search) params.append('search', search);
            if (selectedCategory) params.append('category_id', selectedCategory);
            if (selectedLevel) params.append('level', selectedLevel);

            // Use public endpoint for browsing courses
            const response = await api.get(`/public/courses?${params.toString()}`);
            if (response.data.success) {
                setCourses(response.data.data.courses);
                setPagination(prev => ({
                    ...prev,
                    ...response.data.data.pagination
                }));
            }
        } catch (error) {
            console.error('Failed to load courses:', error);
            // If public endpoint doesn't exist yet, show empty
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchCourses();
    };

    const getLevelBadgeColor = (level) => {
        switch (level) {
            case 'beginner': return 'bg-green-100 text-green-700';
            case 'intermediate': return 'bg-yellow-100 text-yellow-700';
            case 'advanced': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatLevel = (level) => {
        if (level === 'all_levels') return 'All Levels';
        return level.charAt(0).toUpperCase() + level.slice(1);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
                    <p className="text-gray-600">Discover new skills and expand your knowledge</p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                        </form>

                        {/* Category Filter */}
                        <div className="flex items-center gap-2">
                            <FiFilter className="text-gray-400" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Level Filter */}
                        <select
                            value={selectedLevel}
                            onChange={(e) => {
                                setSelectedLevel(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">All Levels</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                {/* Course Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <FiLoader className="animate-spin text-primary-600" size={32} />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <FiBook className="mx-auto text-gray-300" size={48} />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No courses available</h3>
                        <p className="mt-2 text-gray-500">
                            Check back later for new courses or try adjusting your filters.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {courses.map((course) => (
                                <Link
                                    key={course.id}
                                    to={`/courses/${course.id}`}
                                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                                >
                                    {/* Course Thumbnail */}
                                    <div className="aspect-video bg-gradient-to-r from-primary-500 to-primary-600 relative overflow-hidden">
                                        {course.thumbnail ? (
                                            <img 
                                                src={course.thumbnail} 
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FiBook className="text-white/50" size={48} />
                                            </div>
                                        )}
                                        {/* Level Badge */}
                                        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getLevelBadgeColor(course.level)}`}>
                                            {formatLevel(course.level)}
                                        </span>
                                    </div>

                                    {/* Course Info */}
                                    <div className="p-4">
                                        <div className="text-xs text-primary-600 font-medium mb-1">
                                            {course.category_name || 'General'}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                            {course.description || 'No description available'}
                                        </p>

                                        {/* Course Meta */}
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center">
                                                    <FiStar className="text-yellow-400 mr-1" />
                                                    {parseFloat(course.average_rating || 0).toFixed(1)}
                                                </span>
                                                <span className="flex items-center">
                                                    <FiUsers className="mr-1" />
                                                    {course.total_enrollments || 0}
                                                </span>
                                            </div>
                                            {course.duration_hours > 0 && (
                                                <span className="flex items-center">
                                                    <FiClock className="mr-1" />
                                                    {course.duration_hours}h
                                                </span>
                                            )}
                                        </div>

                                        {/* Price / Access */}
                                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                            <span className="text-sm text-gray-500">
                                                By {course.instructor_name}
                                            </span>
                                            {course.access_rule === 'payment' ? (
                                                <span className="font-bold text-primary-600">
                                                    {course.currency === 'INR' ? '₹' : '$'}{course.price}
                                                </span>
                                            ) : (
                                                <span className="text-green-600 font-medium text-sm">Free</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-gray-600">
                                    Page {pagination.page} of {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default BrowseCourses;
