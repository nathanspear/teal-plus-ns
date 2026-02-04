# Teal+ Chrome Extension

A powerful Chrome extension that automates checkbox management in the Teal career platform, helping you quickly manage your resume content.

## 🚀 Features

- **Auto-OFF**: Automatically uncheck multiple checkboxes across your Teal resume sections
- **Smart Filtering**: Target specific sections and preserve selected items
- **Progress Tracking**: Real-time progress indicators and performance metrics
- **Keyboard Shortcuts**: Quick access to features (Ctrl+Shift+A, Ctrl+Shift+S)
- **Custom Sections**: Add your own custom section IDs to process
- **Performance Optimized**: Parallel processing for maximum speed while maintaining reliability

## 📁 Project Structure

```
teal-plus-extension/
├── src/
│   ├── content/                   # Content scripts (runs on Teal pages)
│   │   ├── content-main.js        # Main entry point
│   │   ├── config.js              # Configuration constants
│   │   ├── storage-manager.js     # Chrome storage management
│   │   ├── ui-components.js       # UI elements (button, overlay, toast)
│   │   ├── modals.js              # Payment and settings modals
│   │   ├── auto-off-core.js       # Core automation logic
│   │   └── utils.js               # Utility functions
│   ├── popup/                     # Extension popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── background.js              # Background service worker
├── assets/
│   └── icons/                     # Extension icons
├── docs/                          # Documentation
│   ├── IMPROVEMENTS.md
│   ├── PERFORMANCE_OPTIMIZATION.md
│   ├── TESTING.md
│   └── version-notes/             # Version change logs
├── server/                        # Optional payment backend
│   ├── server.js
│   ├── package.json
│   └── README.md
├── manifest.json                  # Chrome extension manifest
└── README.md                      # This file
```

## 🛠️ Installation

### For Development

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the project root directory

### For Users

(Instructions for installing from Chrome Web Store will go here once published)

## 💻 Usage

1. Navigate to `app.tealhq.com`
2. Open a resume you want to manage
3. Click the "Auto OFF" button (bottom-right of page)
   - Or use keyboard shortcut: **Ctrl+Shift+A**
4. Watch as the extension automatically processes checkboxes
5. View performance metrics in the browser console

### Keyboard Shortcuts

- **Ctrl+Shift+A**: Run Auto-OFF
- **Ctrl+Shift+S**: Open Settings
- **Right-click button**: Access Settings/Payment modal

## ⚙️ Configuration

Access settings by right-clicking the "Auto OFF" button:

- **Auto-save settings**: Automatically save your preferences
- **Show progress bar**: Display progress during processing
- **Enable keyboard shortcuts**: Turn shortcuts on/off
- **Custom sections**: Add custom section IDs to process
- **Preserve elements**: Mark specific checkboxes to never change
- **Exclude sections**: Skip entire sections during processing

## 🏗️ Technical Details

### Architecture

The extension uses a modular architecture:

- **Content Scripts**: Run on Teal pages, implement the core functionality
- **Background Service Worker**: Manages extension lifecycle and storage
- **Popup**: Provides UI for quick access to features and stats
- **Optional Server**: Handles payment processing (can be disabled)

### Key Technologies

- Chrome Extension Manifest V3
- ES6 Modules
- Chrome Storage API
- MutationObserver for DOM monitoring
- Performance API for metrics

### Performance Features

- Parallel section opening for speed
- Sequential checkbox processing for reliability
- Smart wait times for DOM updates
- Lazy-loaded content detection
- Comprehensive performance metrics logging

## 🔧 Development

### Prerequisites

- Node.js (for optional server)
- Chrome browser (latest version recommended)

### Building

No build step required! The extension uses ES6 modules directly.

### Testing

See `docs/TESTING.md` for comprehensive testing guide.

### Making Changes

1. Edit files in `src/` directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Teal+ extension card
4. Test your changes on `app.tealhq.com`

## 📊 Performance

- **Execution Time**: ~10-40 seconds depending on resume size
- **Success Rate**: 95-99% checkbox success rate
- **Sections Supported**: 15+ default sections
- **Parallel Processing**: Opens all sections simultaneously
- **Smart Detection**: Automatically finds checkboxes of all types

## 🐛 Known Limitations

1. Must be on Teal app page to function
2. Requires sections to be visible on page
3. Some dynamically loaded content may need extra wait time
4. Teal's server response time affects overall speed

## 📝 Version History

See `docs/version-notes/` for detailed version change logs.

**Current Version**: 1.1.0

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

(Add your license here)

## 🙏 Credits

Made with ❤️ for Teal users

## 📮 Support

For issues or questions:
- Check `docs/TESTING.md` for troubleshooting
- Review console logs for error messages
- Report issues with full details and console output

---

**Note**: This extension is not officially affiliated with Teal HQ.

