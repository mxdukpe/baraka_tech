const handleShareNamePrice = async () => {
  try {
    if (!product) return;

    // Créer un message qui inclut toutes les informations du produit
    const message = `Découvrez ce produit : ${product.name}\nPrix : ${product.prices[0]?.price || '0.00'} FCFA\n${product.description || ''}`;
    
    let imageUri = product.image;
    
    // Si pas d'image en ligne, utiliser l'image locale
    if (!imageUri) {
      imageUri = Image.resolveAssetSource(ProductImage).uri;
    }

    // Télécharger l'image temporairement
    const downloadResumable = FileSystem.createDownloadResumable(
      imageUri,
      FileSystem.cacheDirectory + 'product_share.jpg'
    );

    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult) {
      Alert.alert('Erreur', "Impossible de télécharger l'image pour le partage");
      return;
    }
    const localUri = downloadResult.uri;

    // Utiliser Share de React Native au lieu de Sharing.shareAsync d'Expo
    await Share.share(
      {
        message: message,
        url: localUri, // Sur iOS, ceci sera l'URL du fichier à partager
        title: product.name,
      },
      {
        dialogTitle: `Partager ${product.name}`, // Pour Android seulement
      }
    );
  } catch (error) {
    console.error('Erreur de partage:', error);
    Alert.alert('Erreur', "Une erreur s'est produite lors du partage");
  }
};