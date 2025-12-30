<template>
  <div class="app-layout">
    <header class="global-nav">
      <div class="brand">Model Builder v1.0</div>
      <nav>
        <router-link to="/">Workbench</router-link>
        <router-link to="/docs">Documentation</router-link>
        <router-link to="/about">About</router-link>
      </nav>
    </header>

    <div class="view-container">
      <router-view />
    </div>
  </div>
</template>

<style>
/* Reset body margin */
body {
  margin: 0;
  padding: 0;
  font-family: Helvetica, Arial, sans-serif;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.global-nav {
  background-color: #333;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  padding-bottom: 0.5rem;
  padding-top: 0.5rem;
}

.global-nav nav a {
  color: #ddd;
  text-decoration: none;
  margin-left: 20px;
  font-size: 0.9rem;
}

.global-nav nav a.router-link-active {
  color: #409eff;
  font-weight: bold;
}

.view-container {
  flex-grow: 1;
  position: relative;
  overflow: hidden;
}
</style>
