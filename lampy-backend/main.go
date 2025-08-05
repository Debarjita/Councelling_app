package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Database Models
type User struct {
	ID                      uint      `json:"id" gorm:"primaryKey"`
	Name                    string    `json:"name" gorm:"not null"`
	Email                   string    `json:"email" gorm:"unique;not null"`
	Password                string    `json:"-" gorm:"not null"`
	IsVerified              bool      `json:"is_verified" gorm:"default:false"`
	PhotoVerified           bool      `json:"photo_verified" gorm:"default:false"`
	AgeVerified             bool      `json:"age_verified" gorm:"default:false"`
	Location                string    `json:"location"`
	ProfilePhotoURL         string    `json:"profile_photo_url"`
	VerificationPhotoURL    string    `json:"verification_photo_url"`
	AgeVerificationPhotoURL string    `json:"age_verification_photo_url"`
	ConsultationPreferences []string  `json:"consultation_preferences" gorm:"serializer:json"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

type Counsellor struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	Name          string    `json:"name" gorm:"not null"`
	Role          string    `json:"role" gorm:"not null"`
	Experience    string    `json:"experience"`
	Qualification string    `json:"qualification"`
	Price         string    `json:"price"`
	Rating        float64   `json:"rating"`
	TotalRatings  int       `json:"total_ratings"`
	ImageURL      string    `json:"image_url"`
	Specialties   []string  `json:"specialties" gorm:"serializer:json"`
	Available     bool      `json:"available" gorm:"default:true"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Session struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	UserID       uint       `json:"user_id"`
	CounsellorID uint       `json:"counsellor_id"`
	SessionDate  time.Time  `json:"session_date"`
	Duration     int        `json:"duration"` // in minutes
	Status       string     `json:"status"`   // pending, confirmed, completed, cancelled
	Notes        string     `json:"notes"`
	User         User       `json:"user" gorm:"foreignKey:UserID"`
	Counsellor   Counsellor `json:"counsellor" gorm:"foreignKey:CounsellorID"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type VerificationRequest struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id"`
	Type      string    `json:"type"`   // "photo", "age"
	Status    string    `json:"status"` // "pending", "approved", "rejected"
	ImageURL  string    `json:"image_url"`
	Reason    string    `json:"reason,omitempty"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Request/Response DTOs
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding="required"`
}

type LocationRequest struct {
	Location string `json:"location" binding:"required"`
}

type PhotoUploadResponse struct {
	UploadURL string `json:"upload_url"`
	ImageURL  string `json:"image_url"`
}

type PreferencesRequest struct {
	Preferences []string `json:"preferences" binding:"required"`
}

type SessionBookingRequest struct {
	CounsellorID uint   `json:"counsellor_id" binding:"required"`
	SessionDate  string `json:"session_date" binding:"required"`
	Duration     int    `json:"duration" binding:"required"`
	Notes        string `json:"notes"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// Global variables
var db *gorm.DB
var jwtSecret = []byte("your-secret-key-change-this-in-production")

// JWT Claims
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

func main() {
	// Initialize database
	initDB()

	// Seed sample data
	seedData()

	// Initialize Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Routes
	api := r.Group("/api/v1")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", register)
			auth.POST("/login", login)
			auth.POST("/verify-photo", authMiddleware(), verifyPhoto)
			auth.POST("/verify-age", authMiddleware(), verifyAge)
		}

		// User routes
		users := api.Group("/users")
		{
			users.Use(authMiddleware())
			users.GET("/profile", getProfile)
			users.PUT("/profile", updateProfile)
			users.POST("/location", updateLocation)
			users.POST("/preferences", updatePreferences)
			users.POST("/upload-photo", uploadPhoto)
		}

		// Counsellor routes
		counsellors := api.Group("/counsellors")
		{
			counsellors.Use(authMiddleware())
			counsellors.GET("/", getCounsellors)
			counsellors.GET("/:id", getCounsellor)
			counsellors.GET("/recommended", getRecommendedCounsellors)
		}

		// Session routes
		sessions := api.Group("/sessions")
		{
			sessions.Use(authMiddleware())
			sessions.POST("/book", bookSession)
			sessions.GET("/", getUserSessions)
			sessions.GET("/:id", getSession)
			sessions.PUT("/:id/cancel", cancelSession)
		}

		// Admin routes (for demo purposes)
		admin := api.Group("/admin")
		{
			admin.POST("/counsellors", createCounsellor)
			admin.GET("/verifications", getVerificationRequests)
			admin.POST("/verifications/:id/approve", approveVerification)
			admin.POST("/verifications/:id/reject", rejectVerification)
		}
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "timestamp": time.Now()})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 LAMPY Backend server starting on port %s\n", port)
	log.Fatal(r.Run(":" + port))
}

func initDB() {
	var err error
	db, err = gorm.Open(sqlite.Open("lampy.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate schemas
	err = db.AutoMigrate(&User{}, &Counsellor{}, &Session{}, &VerificationRequest{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	fmt.Println("✅ Database initialized successfully")
}

func seedData() {
	// Check if counsellors already exist
	var count int64
	db.Model(&Counsellor{}).Count(&count)
	if count > 0 {
		return // Data already seeded
	}

	// Sample counsellors
	counsellors := []Counsellor{
		{
			Name: "John Smith", Role: "Clinical Psychologist", Experience: "40 Yrs",
			Qualification: "M.Phil, M.A, PH.D", Price: "₹5000", Rating: 4.8, TotalRatings: 143,
			ImageURL:    "/images/counsellor1.jpg",
			Specialties: []string{"Stress Management", "Mental Health Concerns", "Career Guidance"},
		},
		{
			Name: "Sarah Johnson", Role: "Counselling Psychologist", Experience: "3 Yrs",
			Qualification: "B.A, M.Sc", Price: "₹800", Rating: 4.7, TotalRatings: 22,
			ImageURL:    "/images/counsellor2.jpg",
			Specialties: []string{"Relationship Issues", "Personal Growth", "Stress Management"},
		},
		{
			Name: "Michael Lee", Role: "Counselling Psychologist", Experience: "3 Yrs",
			Qualification: "MA, MBA", Price: "₹1000", Rating: 4.7, TotalRatings: 92,
			ImageURL:    "/images/counsellor3.jpg",
			Specialties: []string{"Career Guidance", "Decision-Making Support", "Mental Health Concerns"},
		},
		{
			Name: "Emily Davis", Role: "Psychotherapist", Experience: "25 Yrs",
			Qualification: "MA, M.Phil, Ph.D", Price: "₹3400", Rating: 4.9, TotalRatings: 14,
			ImageURL:    "/images/counsellor4.jpg",
			Specialties: []string{"Grief or Loss", "Mental Health Concerns", "Personal Growth"},
		},
		{
			Name: "Daniel Brown", Role: "Psychiatrist", Experience: "5 Yrs",
			Qualification: "MBBS, MD", Price: "₹1000", Rating: 4.7, TotalRatings: 6,
			ImageURL:    "/images/counsellor5.jpg",
			Specialties: []string{"Mental Health Concerns", "Stress Management"},
		},
		{
			Name: "Sophia Wilson", Role: "Psychologist", Experience: "35 Yrs",
			Qualification: "B.A, M.Phil, M.A, PG Diploma", Price: "₹1200", Rating: 4.7, TotalRatings: 190,
			ImageURL:    "/images/counsellor6.jpg",
			Specialties: []string{"Relationship Issues", "Personal Growth", "Grief or Loss", "Stress Management"},
		},
	}

	for _, counsellor := range counsellors {
		db.Create(&counsellor)
	}

	fmt.Println("✅ Sample data seeded successfully")
}

// Middleware
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix
		tokenString = strings.Replace(tokenString, "Bearer ", "", 1)

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims := token.Claims.(*Claims)
		c.Set("user_id", claims.UserID)
		c.Next()
	}
}

// Auth handlers
func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser User
	if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate JWT token
	token, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{Token: token, User: user})
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
}

func verifyPhoto(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	// Handle file upload
	file, header, err := c.Request.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo upload required"})
		return
	}
	defer file.Close()

	// Save file (in production, use cloud storage like AWS S3)
	filename := fmt.Sprintf("verification_%d_%d_%s", userID, time.Now().Unix(), header.Filename)
	filepath := fmt.Sprintf("uploads/verification/%s", filename)

	// Create directories if they don't exist
	os.MkdirAll("uploads/verification", 0755)

	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}

	// Create verification request
	verificationReq := VerificationRequest{
		UserID:   userID,
		Type:     "photo",
		Status:   "pending",
		ImageURL: filepath,
	}

	db.Create(&verificationReq)

	// Update user
	db.Model(&User{}).Where("id = ?", userID).Update("verification_photo_url", filepath)

	c.JSON(http.StatusOK, gin.H{
		"message": "Photo uploaded successfully for verification",
		"status":  "pending"})
}

func verifyAge(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	// Handle file upload
	file, header, err := c.Request.FormFile("id_document")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID document upload required"})
		return
	}
	defer file.Close()

	// Save file
	filename := fmt.Sprintf("age_verification_%d_%d_%s", userID, time.Now().Unix(), header.Filename)
	filepath := fmt.Sprintf("uploads/age_verification/%s", filename)

	os.MkdirAll("uploads/age_verification", 0755)

	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}

	// Create verification request
	verificationReq := VerificationRequest{
		UserID:   userID,
		Type:     "age",
		Status:   "pending",
		ImageURL: filepath,
	}

	db.Create(&verificationReq)

	// Update user
	db.Model(&User{}).Where("id = ?", userID).Update("age_verification_photo_url", filepath)

	c.JSON(http.StatusOK, gin.H{
		"message": "ID document uploaded successfully for age verification",
		"status":  "pending"})
}

// User handlers
func getProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func updateProfile(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

func updateLocation(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req LocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&User{}).Where("id = ?", userID).Update("location", req.Location).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update location"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Location updated successfully"})
}

func updatePreferences(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req PreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&User{}).Where("id = ?", userID).Update("consultation_preferences", req.Preferences).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consultation preferences updated successfully"})
}

func uploadPhoto(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	file, header, err := c.Request.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo upload required"})
		return
	}
	defer file.Close()

	// Save file
	filename := fmt.Sprintf("profile_%d_%d_%s", userID, time.Now().Unix(), header.Filename)
	filepath := fmt.Sprintf("uploads/profiles/%s", filename)

	os.MkdirAll("uploads/profiles", 0755)

	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save photo"})
		return
	}

	// Update user profile photo
	if err := db.Model(&User{}).Where("id = ?", userID).Update("profile_photo_url", filepath).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile photo"})
		return
	}

	c.JSON(http.StatusOK, PhotoUploadResponse{
		UploadURL: filepath,
		ImageURL:  fmt.Sprintf("/uploads/profiles/%s", filename),
	})
}

// Counsellor handlers
func getCounsellors(c *gin.Context) {
	var counsellors []Counsellor

	query := db.Where("available = ?", true)

	// Add filtering by specialties if provided
	if specialties := c.Query("specialties"); specialties != "" {
		specialtyList := strings.Split(specialties, ",")
		for _, specialty := range specialtyList {
			query = query.Where("JSON_EXTRACT(specialties, '$') LIKE ?", "%"+strings.TrimSpace(specialty)+"%")
		}
	}

	if err := query.Find(&counsellors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch counsellors"})
		return
	}

	c.JSON(http.StatusOK, counsellors)
}

func getCounsellor(c *gin.Context) {
	id := c.Param("id")

	var counsellor Counsellor
	if err := db.First(&counsellor, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Counsellor not found"})
		return
	}

	c.JSON(http.StatusOK, counsellor)
}

func getRecommendedCounsellors(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	// Get user's consultation preferences
	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var counsellors []Counsellor
	query := db.Where("available = ?", true)

	// Filter by user's preferences
	if len(user.ConsultationPreferences) > 0 {
		for _, preference := range user.ConsultationPreferences {
			query = query.Or("JSON_EXTRACT(specialties, '$') LIKE ?", "%"+preference+"%")
		}
	}

	if err := query.Order("rating DESC").Limit(10).Find(&counsellors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recommended counsellors"})
		return
	}

	c.JSON(http.StatusOK, counsellors)
}

// Session handlers
func bookSession(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var req SessionBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse session date
	sessionDate, err := time.Parse("2006-01-02T15:04:05Z", req.SessionDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session date format"})
		return
	}

	// Check if counsellor exists and is available
	var counsellor Counsellor
	if err := db.First(&counsellor, req.CounsellorID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Counsellor not found"})
		return
	}

	if !counsellor.Available {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Counsellor is not available"})
		return
	}

	// Create session
	session := Session{
		UserID:       userID,
		CounsellorID: req.CounsellorID,
		SessionDate:  sessionDate,
		Duration:     req.Duration,
		Status:       "pending",
		Notes:        req.Notes,
	}

	if err := db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to book session"})
		return
	}

	// Load relationships
	db.Preload("User").Preload("Counsellor").First(&session, session.ID)

	c.JSON(http.StatusCreated, session)
}

func getUserSessions(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)

	var sessions []Session
	if err := db.Where("user_id = ?", userID).
		Preload("Counsellor").
		Order("session_date DESC").
		Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

func getSession(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	sessionID := c.Param("id")

	var session Session
	if err := db.Where("id = ? AND user_id = ?", sessionID, userID).
		Preload("User").
		Preload("Counsellor").
		First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	c.JSON(http.StatusOK, session)
}

func cancelSession(c *gin.Context) {
	userID := c.MustGet("user_id").(uint)
	sessionID := c.Param("id")

	if err := db.Model(&Session{}).
		Where("id = ? AND user_id = ?", sessionID, userID).
		Update("status", "cancelled").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session cancelled successfully"})
}

// Admin handlers
func createCounsellor(c *gin.Context) {
	var counsellor Counsellor
	if err := c.ShouldBindJSON(&counsellor); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Create(&counsellor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create counsellor"})
		return
	}

	c.JSON(http.StatusCreated, counsellor)
}

func getVerificationRequests(c *gin.Context) {
	var requests []VerificationRequest
	if err := db.Preload("User").Order("created_at DESC").Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch verification requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func approveVerification(c *gin.Context) {
	id := c.Param("id")

	var request VerificationRequest
	if err := db.First(&request, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Verification request not found"})
		return
	}

	// Update verification request status
	if err := db.Model(&request).Update("status", "approved").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to approve verification"})
		return
	}

	// Update user verification status
	if request.Type == "photo" {
		db.Model(&User{}).Where("id = ?", request.UserID).Update("photo_verified", true)
	} else if request.Type == "age" {
		db.Model(&User{}).Where("id = ?", request.UserID).Update("age_verified", true)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification approved successfully"})
}

func rejectVerification(c *gin.Context) {
	id := c.Param("id")

	var request VerificationRequest
	if err := db.First(&request, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Verification request not found"})
		return
	}

	// Get rejection reason from request body
	var body map[string]string
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rejection reason required"})
		return
	}

	reason := body["reason"]
	if reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rejection reason required"})
		return
	}

	// Update verification request
	updates := map[string]interface{}{
		"status": "rejected",
		"reason": reason,
	}

	if err := db.Model(&request).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject verification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Verification rejected successfully"})
}

// Utility functions
func generateJWT(userID uint) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func generateRandomString(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)[:length]
}
