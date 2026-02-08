import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiUserGroup, HiSearch, HiAcademicCap, HiUserAdd, HiCheck, HiX, HiCalendar, HiClock } from 'react-icons/hi';
import api, { cohortsAPI, mentorsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('mentors'); // 'mentors' | 'peers'
  const [mentors, setMentors] = useState([]);
  const [mentorApplication, setMentorApplication] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [applyForm, setApplyForm] = useState({ bio: '', skills: '', ratePerHour: 0 });
  const [loading, setLoading] = useState(false);

  // Booking Modal State
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    scheduledAt: '',
    duration: 30,
    message: '',
    topics: ''
  });

  const { user } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'peers' && searchQuery.length > 2) {
      handleSearchPeers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const fetchData = async () => {
    try {
      const [mentorsRes, myAppRes] = await Promise.all([
        mentorsAPI.getAll(),
        mentorsAPI.getMyApplication()
      ]);

      // Filter out self if user is a mentor
      const allMentors = mentorsRes.data.data || [];
      setMentors(allMentors.filter(m => m.user?._id !== user?._id));

      setMentorApplication(myAppRes.data.data || null);
    } catch (error) {
      // toast.error('Failed to load community data');
    }
  };

  const handleSearchPeers = async () => {
    try {
      const res = await api.get(`/social/users/search?q=${searchQuery}`);
      setSearchResults(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await api.post(`/social/follow/${userId}`);
      toast.success('Followed user!');
      handleSearchPeers(); // Refresh to show 'following' status
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to follow');
    }
  };

  const handleApplyMentor = async (e) => {
    e.preventDefault();
    try {
      await mentorsAPI.apply({
        bio: applyForm.bio,
        skills: applyForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        ratePerHour: Number(applyForm.ratePerHour || 0)
      });
      toast.success('Application submitted');
      setApplyForm({ bio: '', skills: '', ratePerHour: 0 });
      fetchData();
    } catch (error) {
      toast.error('Failed to apply');
    }
  };

  const initBooking = (mentor) => {
    setBookingMentor(mentor);
    setBookingForm({ scheduledAt: '', duration: 30, message: '', topics: '' });
  };

  const handleBookSession = async (e) => {
    e.preventDefault();
    if (!bookingForm.scheduledAt) return toast.error('Please select a time');

    try {
      setLoading(true);
      await mentorsAPI.bookSession(bookingMentor._id, {
        ...bookingForm,
        topics: bookingForm.topics.split(',').map(t => t.trim()).filter(Boolean)
      });
      toast.success('Booking request sent!');
      setBookingMentor(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Community Hub</h1>
          <p className="text-muted-foreground mt-1">Connect, learn, and grow together.</p>
        </div>

        <div className="flex bg-muted/50 p-1 rounded-lg">
          {['mentors', 'peers'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">

        {activeTab === 'mentors' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Expert Mentors</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {mentors.map((mentor) => (
                  <div key={mentor._id} className="p-6 bg-card rounded-xl border border-border text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white mb-4">
                      {mentor.user?.name?.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{mentor.user?.name}</h3>
                    <p className="text-primary text-sm mb-2">{mentor.user?.preferences?.targetRole?.title || 'Mentor'}</p>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{mentor.bio}</p>
                    <div className="flex flex-wrap justify-center gap-1 mb-4">
                      {(mentor.skills || []).slice(0, 3).map(skill => (
                        <span key={skill} className="px-2 py-1 bg-muted text-xs rounded text-muted-foreground">{skill}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => initBooking(mentor)}
                      className="btn-secondary w-full"
                    >
                      Book Session
                    </button>
                  </div>
                ))}
              </div>
              {mentors.length === 0 && <p className="text-muted-foreground">No mentors available yet.</p>}
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
              {bookingMentor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-background rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
                  >
                    <div className="flex justify-between items-center p-6 border-b">
                      <h3 className="text-xl font-bold">Book Session with {bookingMentor.user?.name}</h3>
                      <button onClick={() => setBookingMentor(null)} className="p-2 hover:bg-muted rounded-full">
                        <HiX className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleBookSession} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Date & Time</label>
                          <input
                            type="datetime-local"
                            required
                            className="input w-full"
                            value={bookingForm.scheduledAt}
                            onChange={e => setBookingForm({ ...bookingForm, scheduledAt: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Duration (min)</label>
                          <select
                            className="input w-full"
                            value={bookingForm.duration}
                            onChange={e => setBookingForm({ ...bookingForm, duration: Number(e.target.value) })}
                          >
                            <option value={15}>15 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={45}>45 Minutes</option>
                            <option value={60}>60 Minutes</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Topics (comma separated)</label>
                        <input
                          className="input w-full"
                          placeholder="e.g. Career advice, React hooks, Code review"
                          value={bookingForm.topics}
                          onChange={e => setBookingForm({ ...bookingForm, topics: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Message</label>
                        <textarea
                          rows={3}
                          className="input w-full"
                          placeholder="What would you like to discuss?"
                          value={bookingForm.message}
                          onChange={e => setBookingForm({ ...bookingForm, message: e.target.value })}
                        />
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setBookingMentor(null)}
                          className="btn-ghost"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary"
                        >
                          {loading ? 'Sending Request...' : 'Confirm Booking'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="card p-6 bg-gradient-to-r from-muted/50 to-muted/30">
              <h2 className="text-xl font-bold text-foreground mb-4">Become a Mentor</h2>
              {mentorApplication ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                  Application Status: <span className="font-bold uppercase">{mentorApplication.status}</span>
                </div>
              ) : (
                <form onSubmit={handleApplyMentor} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Bio</label>
                    <textarea
                      rows={3}
                      className="input w-full"
                      value={applyForm.bio}
                      onChange={(e) => setApplyForm({ ...applyForm, bio: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Skills</label>
                    <input
                      className="input w-full"
                      placeholder="e.g. React, Node.js, Python"
                      value={applyForm.skills}
                      onChange={(e) => setApplyForm({ ...applyForm, skills: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Hourly Rate ($)</label>
                    <input
                      type="number"
                      className="input w-full"
                      value={applyForm.ratePerHour}
                      onChange={(e) => setApplyForm({ ...applyForm, ratePerHour: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary">Submit Application</button>
                </form>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'peers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 min-h-[400px]">
            <h2 className="text-xl font-bold text-foreground mb-6">Find Peers</h2>
            <div className="max-w-xl mx-auto mb-8 relative">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name..."
                className="input w-full pl-12 py-3 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              {searchResults.map(user => (
                <div key={user._id} className="flex items-center justify-between p-4 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg">
                      {user.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-foreground font-bold">{user.name}</h3>
                      <p className="text-muted-foreground text-sm">{user.preferences?.targetRole?.title || 'Student'}</p>
                    </div>
                  </div>
                  {user.isFollowing ? (
                    <button disabled className="btn-ghost text-green-400 flex items-center gap-2">
                      <HiCheck className="w-5 h-5" /> Following
                    </button>
                  ) : (
                    <button onClick={() => handleFollow(user._id)} className="btn-primary btn-sm flex items-center gap-2">
                      <HiUserAdd className="w-4 h-4" /> Follow
                    </button>
                  )}
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && (
                <p className="text-center text-muted-foreground">No users found.</p>
              )}
              {!searchQuery && (
                <div className="text-center py-10 opacity-50">
                  <HiUserGroup className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Search for friends to start building your network</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
