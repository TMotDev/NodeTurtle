package utils

// Ptr creates a pointer to value T
func Ptr[T any](v T) *T {
	return &v
}
