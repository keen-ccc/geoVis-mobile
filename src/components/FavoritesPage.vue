<script setup lang="ts">
import { useCollection } from '@/composables/useCollection'

defineEmits(['back'])
const { favorites, toggleFavorite } = useCollection()
</script>

<template>
  <div class="favorites-page">
    <van-nav-bar
      title="我的收藏"
      left-text="返回"
      left-arrow
      @click-left="$emit('back')"
    />

    <div v-if="favorites.length === 0" class="empty">
      <van-icon name="star-o" size="48" color="#c8c9cc" />
      <p>暂无收藏</p>
    </div>

    <div v-else class="list">
      <div v-for="item in favorites" :key="item.id" class="fav-card">
        <div class="fav-info">
          <h4>{{ item.name }}</h4>
          <p><van-icon name="location-o" /> {{ item.address }}</p>
          <div class="fav-tags">
            <van-tag plain type="primary" size="mini">{{ item.entityType }}</van-tag>
            <van-tag plain size="mini">{{ item.hyclass }}</van-tag>
          </div>
          <span class="fav-time">{{ item.addedAt }}</span>
        </div>
        <van-icon
          name="star"
          size="20"
          color="#ff976a"
          @click="toggleFavorite(item)"
          style="cursor:pointer;flex-shrink:0"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c8c9cc;
  font-size: 14px;
}

.empty p { margin-top: 12px; }

.list {
  padding: 12px 16px;
}

.fav-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 10px;
}

.fav-info {
  flex: 1;
}

.fav-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #323233;
}

.fav-info p {
  margin: 0 0 6px;
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
  gap: 2px;
}

.fav-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.fav-time {
  font-size: 11px;
  color: #c8c9cc;
}
</style>
