'use client';

import { Car } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal from '@/components/ProfileModal';
import LikesPopup from '@/components/LikesPopup';
import AdminCarWashEditModal from '@/components/AdminCarWashEditModal';
import AdminImageGalleryModal from '@/components/AdminImageGalleryModal';
import AdminCarWashStats from '@/components/AdminCarWashStats';
import AdminCarWashFiltersPanel from '@/components/AdminCarWashFiltersPanel';
import {
  AdminCarWashFilterToggleButton,
  AdminCarWashActivityTypeTabs,
} from '@/components/AdminCarWashHeaderControls';
import AdminCarWashActivityCard from '@/components/AdminCarWashActivityCard';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminCarWashController } from '@/hooks/useAdminCarWashController';

export default function AdminCarWashPage() {
  const { user } = useAdminSession();
  const {
    activities,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    selectedDriver,
    setSelectedDriver,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showFilters,
    toggleFilters,
    filterActivityType,
    setFilterActivityType,
    commentingOn,
    commentText,
    setCommentText,
    sendingComment,
    commentInputRef,
    menuOpen,
    toggleMenu,
    editActivity,
    editCaption,
    setEditCaption,
    saving,
    galleryImages,
    galleryIndex,
    setGalleryIndex,
    profileUser,
    showProfile,
    closeProfile,
    likesPopupData,
    showLikesPopup,
    openLikesPopup,
    closeLikesPopup,
    openProfile,
    todayCount,
    weekCount,
    monthCount,
    markedCount,
    hasFilters,
    clearFilters,
    handleLike,
    handleComment,
    handleDeleteComment,
    handleMark,
    handleDelete,
    handleEditSave,
    openEdit,
    closeEdit,
    openGallery,
    closeGallery,
    prevGallery,
    nextGallery,
    toggleComments,
    isLiked,
    drivers,
  } = useAdminCarWashController(
    user ? { id: user.id, name: user.name } : null,
  );

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader
          title="Moments กิจกรรม"
          backHref="/admin/home"
          rightContent={
            <AdminCarWashFilterToggleButton
              hasFilters={hasFilters}
              open={showFilters}
              onToggle={toggleFilters}
            />
          }
        />

        <AdminCarWashActivityTypeTabs
          filterActivityType={filterActivityType}
          onChangeFilterActivityType={setFilterActivityType}
        />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            <AdminCarWashStats
              todayCount={todayCount}
              weekCount={weekCount}
              monthCount={monthCount}
              approvedCount={markedCount}
            />

            <AdminCarWashFiltersPanel
              open={showFilters}
              drivers={drivers}
              selectedDriver={selectedDriver}
              startDate={startDate}
              endDate={endDate}
              hasFilters={hasFilters}
              onSelectedDriverChange={setSelectedDriver}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClearFilters={clearFilters}
            />

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : activities.length === 0 ? (
              <div className="card p-12 text-center">
                <Car className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>ไม่มีกิจกรรม</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <AdminCarWashActivityCard
                    key={activity._id}
                    activity={activity}
                    index={index}
                    isLiked={isLiked(activity)}
                    isCommentOpen={commentingOn === activity._id}
                    isMenuOpen={menuOpen === activity._id}
                    commentText={commentText}
                    sendingComment={sendingComment}
                    currentUser={{ id: user.id, name: user.name }}
                    commentInputRef={commentInputRef}
                    onOpenProfile={openProfile}
                    onToggleMenu={toggleMenu}
                    onMark={handleMark}
                    onOpenEdit={openEdit}
                    onDelete={handleDelete}
                    onOpenGallery={openGallery}
                    onOpenLikes={openLikesPopup}
                    onLike={handleLike}
                    onToggleComments={toggleComments}
                    onDeleteComment={handleDeleteComment}
                    onCommentTextChange={setCommentText}
                    onCommentSubmit={handleComment}
                  />
                ))}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-6">
                    {loadingMore && (
                      <div className="w-8 h-8 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminCarWashEditModal
        open={!!editActivity}
        caption={editCaption}
        saving={saving}
        onCaptionChange={setEditCaption}
        onClose={closeEdit}
        onSave={handleEditSave}
      />

      <AdminImageGalleryModal
        images={galleryImages}
        currentIndex={galleryIndex}
        onClose={closeGallery}
        onPrev={prevGallery}
        onNext={nextGallery}
        onSelectIndex={setGalleryIndex}
      />

      <LikesPopup likes={likesPopupData} open={showLikesPopup} onClose={closeLikesPopup} />
      <ProfileModal user={profileUser} open={showProfile} onClose={closeProfile} />
      <BottomNav role="admin" />
    </div>
  );
}
