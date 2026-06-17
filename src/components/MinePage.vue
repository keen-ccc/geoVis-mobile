<script setup lang="ts">
import { ref } from 'vue'
import FavoritesPage from './FavoritesPage.vue'
import FollowUpsPage from './FollowUpsPage.vue'

const activeView = ref<'list' | 'favorites' | 'followups'>('list')

function goBack() {
  activeView.value = 'list'
}
</script>

<template>
  <div class="mine-page">
    <van-nav-bar title="我的" />

    <!-- 列表页 -->
    <div v-if="activeView === 'list'" class="menu-list">
      <div class="menu-item" @click="activeView = 'favorites'">
        <van-icon name="star-o" size="22" color="#ff976a" />
        <span>我的收藏</span>
        <van-icon name="arrow" size="16" color="#c8c9cc" />
      </div>
      <div class="menu-item" @click="activeView = 'followups'">
        <van-icon name="records-o" size="22" color="#1989fa" />
        <span>我的跟进</span>
        <van-icon name="arrow" size="16" color="#c8c9cc" />
      </div>
    </div>

    <!-- 收藏页 -->
    <FavoritesPage
      v-if="activeView === 'favorites'"
      @back="goBack"
    />

    <!-- 跟进页 -->
    <FollowUpsPage
      v-if="activeView === 'followups'"
      @back="goBack"
    />
  </div>
</template>

<style scoped>
.mine-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.menu-list {
  padding: 12px 16px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 15px;
  color: #323233;
  cursor: pointer;
}

.menu-item span {
  flex: 1;
}

.menu-item:active {
  background: #f7f8fa;
}
</style>
