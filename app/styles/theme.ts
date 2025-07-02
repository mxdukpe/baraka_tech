// src/styles/theme.ts
const colors = {
    primary: '#F58320',       // Orange de votre application
    primaryDark: '#D06000',   // Version plus sombre de l'orange
    white: '#FFFFFF',
    black: '#000000',
    grey: {
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    blue: {
      light: '#3498db',
      dark: '#2980b9',
    },
    success: '#2ecc71',
    error: '#e74c3c'
  };

export const lightTheme = {
    background: '#f5f5f5',
    text: '#2c3e50',
    input: {
      background: '#ffffff',
      text: '#2c3e50',
      border: '#cccccc',
    },
    button: {
      background: '#F58320',
      text: '#ffffff',
    },
    disabled: {
      background: '#dddddd',
      text: '#777777',
    },
    header: {
        backgroundColor: '#FFF5EC',
        background: '#FFF5EC',
        text: '#000000',
    },
    notificationBannerBg: '#F8F9FA',
  notificationBannerBorder: '#E9ECEF',
  notificationText: '#495057',
  notificationIcon: '#F58320',
  notificationActiveDot: '#F58320',
  notificationInactiveDot: '#ADB5BD',
  };
  
  export const darkTheme = {
    background: '#3a3a3a',
    text: '#ecf0f1',
    input: {
      background: '#3a3a3a',
      text: '#ecf0f1',
      border: '#7f8c8d',
    },
    button: {
      background: '#F58320',
      text: '#ffffff',
    },
    disabled: {
      background: '#707070',
      text: '#95a5a6',
    },
    header: {
        backgroundColor: '#2d2d2d',
        background: '#FFF5EC',
        text: '#fff5ec',
    },
    notificationBannerBg: '#2D3035',
  notificationBannerBorder: '#3D4147',
  notificationText: '#E9ECEF',
  notificationIcon: '#F58320',
  notificationActiveDot: '#F58320',
  notificationInactiveDot: '#6C757D',
  };