<template>
  <el-container class="docs-page">
    <el-aside width="250px">
      <el-menu :default-active="activeTab" @select="handleSelect">
        <el-menu-item index="intro">Introduction</el-menu-item>
        <el-menu-item index="tutorial">Tutorial</el-menu-item>
      </el-menu>
    </el-aside>

    <el-main class="markdown-body">
      <component :is="currentComponent" />
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'

// Import your markdown files using the alias
import IntroDoc from '@docs/ca-model-builder-introduction.md'
import TutorialDoc from '@docs/model-builder-tutorial.md'

// Map keys to the imported components
const tabs = {
  intro: IntroDoc,
  tutorial: TutorialDoc,
}

const activeTab = ref('intro')

const currentComponent = computed(() => tabs[activeTab.value])

function handleSelect(key) {
  activeTab.value = key
}
</script>

<style>
/* OPTIONAL: Markdown files render raw HTML. 
   You usually need a CSS library like 'github-markdown-css' 
   to make them look nice (headers, code blocks, lists).
*/
@import 'github-markdown-css/github-markdown.css';

.markdown-body {
  padding: 40px;
  max-width: 900px;
}
</style>
