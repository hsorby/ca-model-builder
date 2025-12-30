<template>
  <el-empty description="Page Not Found">
    <template #extra>
      <el-button type="primary" @click="$router.push('/')">
        Back to Workbench
      </el-button>
    </template>
  </el-empty>
</template>
