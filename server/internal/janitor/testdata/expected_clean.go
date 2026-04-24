func handler(w http.ResponseWriter, r *http.Request) {
    user := getUser(r)
    
    processOld(w, r)
    
    render(w, r)
}