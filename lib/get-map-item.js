function getMapItem(error) {
  const { name, code } = error;
  const mapItem = this.errorMap[name] || this.errorMap[code];
  
  return mapItem || null; 
}

module.exports = getMapItem;