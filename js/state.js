export const state = {
    posts: [],
    visible: [],
    homework: "All homeworks",
    model: "All models",
    query: "",
    sort: "Newest first",
    tab: "overview", // overview | homework | model
    theme: "auto",  // auto | light | dark
  };
  
  export function setState(patch) {
    Object.assign(state, patch);
  }
  