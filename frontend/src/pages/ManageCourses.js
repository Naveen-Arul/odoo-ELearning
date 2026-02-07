import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { courseService } from '../services/courseService';
import { useAuth } from '../context/AuthContext';
import { 
    FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, 
    FiSearch, FiFilter, FiBook, FiUsers, FiStar,
    FiMoreVertical, FiLoader
} from 'react-icons/fi';

const ManageCourses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, published, draft
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [stats, setStats] = useState(null);
    const [actionMenu, setActionMenu] = useState(null);

    useEffect(() => {
        fetchCourses();
        fetchStats();
    }, [pagination.page, filter]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: search || undefined,
                is_published: filter === 'published' ? 'true' : filter === 'draft' ? 'false' : undefined
            };
            const response = await courseService.getCourses(params);
            if (response.success) {
                setCourses(response.data.courses);
                setPagination(prev => ({
                    ...prev,
                    ...response.data.pagination
                }));
            }
        } catch (error) {
            toast.error('Failed to load courses');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await courseService.getStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchCourses();
    };

    const handlePublish = async (courseId) => {
        try {
            const response = await courseService.publishCourse(courseId);
            if (response.success) {
                toast.success('Course published successfully!');
                fetchCourses();
                fetchStats();
            }
        } catch (error) {
            toast.error('Failed to publish course');
        }
        setActionMenu(null);
    };

    const handleUnpublish = async (courseId) => {
        try {
            const response = await courseService.unpublishCourse(courseId);
            if (response.success) {
                toast.success('Course unpublished');
                fetchCourses();
                fetchStats();
            }
        } catch (error) {
            toast.error('Failed to unpublish course');
        }
        setActionMenu(null);
    };

    const handleDelete = async (courseId) => {
        if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }
        try {
            const response = await courseService.deleteCourse(courseId);
            if (response.success) {
                toast.success('Course deleted successfully');
                fetchCourses();
                fetchStats();
            }
        } catch (error) {
            toast.error('Failed to delete course');
        }
        setActionMenu(null);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
                        <p className="text-gray-600">Create and manage your courses</p>
                    </div>
                    <Link
                        to="/manage-courses/new"
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <FiPlus className="mr-2" />
                        Create Course
                    </Link>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-500">Total Courses</div>
                                    <div className="text-2xl font-bold text-gray-900">{stats.total_courses || 0}</div>
                                </div>
                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                    <FiBook className="text-primary-600" size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-500">Published</div>
                                    <div className="text-2xl font-bold text-green-600">{stats.published_courses || 0}</div>
                                </div>
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FiEye className="text-green-600" size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-500">Drafts</div>
                                    <div className="text-2xl font-bold text-yellow-600">{stats.draft_courses || 0}</div>
                                </div>
                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <FiEyeOff className="text-yellow-600" size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-500">Total Students</div>
                                    <div className="text-2xl font-bold text-purple-600">{stats.total_enrollments || 0}</div>
                                </div>
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <FiUsers className="text-purple-600" size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters & Search */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
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
                        <div className="flex items-center gap-2">
                            <FiFilter className="text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">All Courses</option>
                                <option value="published">Published</option>
                                <option value="draft">Drafts</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Courses Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <FiLoader className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="text-center py-12">
                            <FiBook className="mx-auto text-gray-300" size={48} />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No courses yet</h3>
                            <p className="mt-2 text-gray-500">Get started by creating your first course.</p>
                            <Link
                                to="/manage-courses/new"
                                className="inline-flex items-center mt-4 px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                <FiPlus className="mr-2" />
                                Create Course
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Course
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Category
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Students
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rating
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {courses.map((course) => (
                                            <tr key={course.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            {course.thumbnail ? (
                                                                <img src={course.thumbnail} alt={course.title} className="w-12 h-12 rounded-lg object-cover" />
                                                            ) : (
                                                                <FiBook className="text-white" size={20} />
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                                                            <div className="text-sm text-gray-500 capitalize">{course.level}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600">{course.category_name || 'Uncategorized'}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {course.is_published ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            <FiEye className="mr-1" size={12} />
                                                            Published
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <FiEyeOff className="mr-1" size={12} />
                                                            Draft
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {course.total_enrollments || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <FiStar className="text-yellow-400 mr-1" />
                                                        {parseFloat(course.average_rating || 0).toFixed(1)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setActionMenu(actionMenu === course.id ? null : course.id)}
                                                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                                        >
                                                            <FiMoreVertical size={20} />
                                                        </button>
                                                        {actionMenu === course.id && (
                                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                                                                <Link
                                                                    to={`/manage-courses/${course.id}/edit`}
                                                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                                >
                                                                    <FiEdit2 className="mr-3" size={16} />
                                                                    Edit Course
                                                                </Link>
                                                                {course.is_published ? (
                                                                    <button
                                                                        onClick={() => handleUnpublish(course.id)}
                                                                        className="w-full flex items-center px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                                                                    >
                                                                        <FiEyeOff className="mr-3" size={16} />
                                                                        Unpublish
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handlePublish(course.id)}
                                                                        className="w-full flex items-center px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                                                    >
                                                                        <FiEye className="mr-3" size={16} />
                                                                        Publish
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDelete(course.id)}
                                                                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                                >
                                                                    <FiTrash2 className="mr-3" size={16} />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="px-6 py-4 border-t flex items-center justify-between">
                                    <div className="text-sm text-gray-500">
                                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} courses
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                            disabled={pagination.page === 1}
                                            className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                            disabled={pagination.page === pagination.totalPages}
                                            className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Click outside to close action menu */}
            {actionMenu && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setActionMenu(null)}
                />
            )}
        </Layout>
    );
};

export default ManageCourses;
