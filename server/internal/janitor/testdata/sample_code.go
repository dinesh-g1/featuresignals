func handler(w http.ResponseWriter, r *http.Request) {
    user := getUser(r)
    
    if features.IsEnabled("new-pipeline", user) {
        processNew(w, r)
    } else {
        processOld(w, r)
    }
    
    render(w, r)
}