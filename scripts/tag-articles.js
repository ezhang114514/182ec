// Script to analyze articles and assign tags based on content
// Run with: node scripts/tag-articles.js

const fs = require('fs');
const path = require('path');

const availableTags = [
  "optimization",
  "SGD",
  "momentum",
  "implicit regularization",
  "Adam",
  "features/representation",
  "optimizer comparisons",
  "induced matrix norms",
  "μP (maximal update parameterization)",
  "MuON",
  "CNNs",
  "pooling/downsampling",
  "data augmentation",
  "normalization layers",
  "dropout",
  "ResNets",
  "fully convolutional networks (FCNs)",
  "U-Nets",
  "GNNs",
  "DiffPool",
  "RNNs",
  "self-supervision",
  "state-space models (SSMs)",
  "attention",
  "Transformers",
  "in-context learning (ICL)",
  "prompting",
  "PEFT",
  "soft prompting",
  "LoRA",
  "transfer learning",
  "meta-learning",
  "generative models",
  "post-training"
];

// Tag mapping with keywords and variations
const tagKeywords = {
  "optimization": ["optimization", "optimizer", "optimize", "optimizing", "gradient descent"],
  "SGD": ["SGD", "stochastic gradient descent", "vanilla sgd", "gradient descent"],
  "momentum": ["momentum", "momentum-based", "momentum sgd", "momentum optimizer"],
  "implicit regularization": ["implicit regularization", "implicit regulariz", "implicit bias"],
  "Adam": ["Adam", "adam optimizer", "adamw", "adaptive moment"],
  "features/representation": ["features", "representation", "feature learning", "representations", "feature space"],
  "optimizer comparisons": ["optimizer comparison", "compare optimizers", "optimizer vs", "sgd vs", "adam vs", "momentum vs"],
  "induced matrix norms": ["induced matrix norm", "matrix norm", "induced norm", "frobenius", "spectral norm"],
  "μP (maximal update parameterization)": ["μP", "muP", "maximal update", "parameterization", "mup"],
  "MuON": ["MuON", "muon", "second-order", "second order"],
  "CNNs": ["CNN", "CNNs", "convolutional", "conv net", "convolutional neural network"],
  "pooling/downsampling": ["pooling", "downsampling", "max pool", "average pool", "downsample"],
  "data augmentation": ["data augmentation", "augment", "augmentation", "augmented data"],
  "normalization layers": ["normalization", "batch norm", "layer norm", "instance norm", "group norm", "normalization layer"],
  "dropout": ["dropout", "drop out"],
  "ResNets": ["ResNet", "ResNets", "residual network", "residual connection", "skip connection"],
  "fully convolutional networks (FCNs)": ["FCN", "FCNs", "fully convolutional", "fully convolutional network"],
  "U-Nets": ["U-Net", "U-Nets", "unet", "unets", "u-net"],
  "GNNs": ["GNN", "GNNs", "graph neural network", "graph neural", "graph network"],
  "DiffPool": ["DiffPool", "diffpool", "differentiable pooling"],
  "RNNs": ["RNN", "RNNs", "recurrent neural network", "recurrent", "lstm", "gru"],
  "self-supervision": ["self-supervision", "self-supervised", "self supervision", "self supervised"],
  "state-space models (SSMs)": ["SSM", "SSMs", "state space", "state-space", "state space model"],
  "attention": ["attention", "attention mechanism", "attention layer", "self-attention", "self attention"],
  "Transformers": ["Transformer", "Transformers", "transformer", "transformer model", "transformer architecture"],
  "in-context learning (ICL)": ["in-context learning", "ICL", "in context learning", "few-shot", "few shot"],
  "prompting": ["prompt", "prompting", "prompts", "prompt engineering"],
  "PEFT": ["PEFT", "parameter efficient", "parameter-efficient"],
  "soft prompting": ["soft prompt", "soft prompting", "learnable prompt"],
  "LoRA": ["LoRA", "lora", "low-rank adaptation", "low rank"],
  "transfer learning": ["transfer learning", "transfer", "fine-tuning", "fine tuning", "finetuning"],
  "meta-learning": ["meta-learning", "meta learning", "learn to learn", "maml"],
  "generative models": ["generative", "generation", "generative model", "VAE", "GAN", "diffusion", "autoregressive"],
  "post-training": ["post-training", "post training", "posttrain", "alignment", "RLHF"]
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function assignTags(article) {
  const tags = new Set();
  
  // Combine all text content
  const textContent = [
    article.title || '',
    article.dek || '',
    stripHtml(article.body_html || '')
  ].join(' ').toLowerCase();
  
  // Check each tag's keywords
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    for (const keyword of keywords) {
      // Use word boundaries for better matching
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(textContent)) {
        tags.add(tag);
        break; // Found a match, no need to check other keywords for this tag
      }
    }
  }
  
  return Array.from(tags).sort();
}

function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'articles.json');
  
  console.log('Reading articles.json...');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log(`Processing ${data.length} articles...`);
  
  let taggedCount = 0;
  for (const article of data) {
    const tags = assignTags(article);
    if (tags.length > 0) {
      article.tags = tags;
      taggedCount++;
      console.log(`Tagged "${article.title.substring(0, 50)}..." with: ${tags.join(', ')}`);
    } else {
      article.tags = [];
    }
  }
  
  console.log(`\nTagged ${taggedCount} articles out of ${data.length}`);
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Updated articles.json with tags!');
}

main();

