async function requestor(_axios, path) {
  const resp = await _axios.get(path);
  if (!resp.hasOwnProperty("data")) {
    throw "Response doesnt have property data";
  }

  return resp.data;
}

module.exports = requestor;

